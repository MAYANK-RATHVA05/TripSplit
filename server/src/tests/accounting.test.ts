import { calculateSplits, validatePayers } from '../domain/splitting.js';
import { toMinorUnits, toDecimalString, formatMoney } from '../domain/currencies.js';
import { convertCurrency, createConversionSnapshot } from '../domain/money.js';
import { calculateGroupBalances, ExpenseRecord, SettlementRecord } from '../domain/balances.js';
import { generateSettlementSuggestions } from '../domain/settlements.js';

describe('TripSplit Accounting Domain Engine Verification', () => {

  // Scenario 1: INR 100 split three ways (deterministic rounding preservation)
  test('Scenario 1: INR 100 split three ways preserves exactly INR 100', () => {
    const totalMinor = toMinorUnits('100.00', 'INR'); // 10000n
    const participants = [
      { memberId: 'member-A' },
      { memberId: 'member-B' },
      { memberId: 'member-C' }
    ];

    const result = calculateSplits(totalMinor, 'INR', 'EQUAL', participants);
    expect(result.shares).toHaveLength(3);

    // Sum must equal 10000n exactly
    const sum = result.shares.reduce((acc, s) => acc + BigInt(s.amountMinor), 0n);
    expect(sum).toBe(10000n);

    // Minor units should be 3334, 3333, 3333
    expect(result.shares[0].amountDecimal).toBe('33.34');
    expect(result.shares[1].amountDecimal).toBe('33.33');
    expect(result.shares[2].amountDecimal).toBe('33.33');
    expect(result.explanation).toContain('remainder allocated deterministically');
  });

  // Scenario 2: Payer excluded from participants
  test('Scenario 2: Payer excluded from participants (payer contribution recorded, share is zero)', () => {
    const totalMinor = toMinorUnits('60.00', 'USD'); // 6000n
    const payers = [{ memberId: 'payer-A', amountMinor: '6000' }];
    const payerValidation = validatePayers(totalMinor, 'USD', payers);
    expect(payerValidation.payers[0].amountDecimal).toBe('60.00');

    // Only B and C participate
    const participants = [
      { memberId: 'member-B' },
      { memberId: 'member-C' }
    ];
    const splitResult = calculateSplits(totalMinor, 'USD', 'EQUAL', participants);
    expect(splitResult.shares).toHaveLength(2);
    expect(splitResult.shares[0].amountDecimal).toBe('30.00');
    expect(splitResult.shares[1].amountDecimal).toBe('30.00');

    // In balance calculation: A paid 60, share 0. B paid 0, share 30. C paid 0, share 30.
    const expense: ExpenseRecord = {
      _id: 'exp-1',
      description: 'Groceries for B and C',
      date: '2026-10-01',
      category: 'Groceries',
      originalCurrency: 'USD',
      exchangeRate: '1.0',
      baseCurrency: 'USD',
      baseAmountMinor: '6000',
      isVoided: false,
      payers: [{ memberId: 'payer-A', amountMinor: '6000' }],
      participants: splitResult.shares.map(s => ({ memberId: s.memberId, amountMinor: s.amountMinor }))
    };

    const balances = calculateGroupBalances(['payer-A', 'member-B', 'member-C'], 'USD', [expense], []);
    expect(balances.isBalanced).toBe(true);

    const balA = balances.memberBalances.find(m => m.memberId === 'payer-A')!;
    const balB = balances.memberBalances.find(m => m.memberId === 'member-B')!;
    const balC = balances.memberBalances.find(m => m.memberId === 'member-C')!;

    expect(balA.totalPaidDecimal).toBe('60.00');
    expect(balA.totalShareDecimal).toBe('0.00');
    expect(balA.netBalanceDecimal).toBe('60.00');
    expect(balA.status).toBe('receives');

    expect(balB.totalPaidDecimal).toBe('0.00');
    expect(balB.totalShareDecimal).toBe('30.00');
    expect(balB.netBalanceDecimal).toBe('-30.00');
    expect(balB.status).toBe('owes');

    expect(balC.netBalanceDecimal).toBe('-30.00');
  });

  // Scenario 3: Two payers, both contributions match total
  test('Scenario 3: Two payers match total', () => {
    const totalMinor = toMinorUnits('100.00', 'USD');
    const payers = [
      { memberId: 'member-A', amountMinor: '4000' },
      { memberId: 'member-B', amountMinor: '6000' }
    ];
    const validation = validatePayers(totalMinor, 'USD', payers);
    expect(validation.totalMinor).toBe('10000');
  });

  // Scenario 4: Exact/percentage mismatch rejected with field-level explanation
  test('Scenario 4: Exact or percentage mismatch is rejected with descriptive error', () => {
    const totalMinor = toMinorUnits('100.00', 'USD'); // 10000n

    // Exact mismatch
    expect(() => {
      calculateSplits(totalMinor, 'USD', 'EXACT', [
        { memberId: 'member-A', exactAmountMinor: '5000' },
        { memberId: 'member-B', exactAmountMinor: '4500' }
      ]);
    }).toThrow('Shares total 95.00. Add 5.00 to match the bill of 100.00.');

    // Percentage mismatch
    expect(() => {
      calculateSplits(totalMinor, 'USD', 'PERCENTAGE', [
        { memberId: 'member-A', percentage: 50 },
        { memberId: 'member-B', percentage: 45 }
      ]);
    }).toThrow('Percentages must total 100%. Current total is 95.00%.');
  });

  // Scenario 5: Currency without two decimal places (JPY 0 decimals, BHD 3 decimals)
  test('Scenario 5: Non-2-decimal currency handling (JPY and BHD)', () => {
    // JPY (0 decimals)
    const jpyMinor = toMinorUnits('15000', 'JPY');
    expect(jpyMinor).toBe(15000n);
    expect(toDecimalString(15000n, 'JPY')).toBe('15000');
    expect(formatMoney(15000n, 'JPY')).toBe('¥15000');

    // BHD (3 decimals)
    const bhdMinor = toMinorUnits('12.350', 'BHD');
    expect(bhdMinor).toBe(12350n);
    expect(toDecimalString(12350n, 'BHD')).toBe('12.350');
    expect(formatMoney(12350n, 'BHD')).toBe('BD12.350');
  });

  // Scenario 6: Multi-currency conversion with frozen rates
  test('Scenario 6: Multi-currency conversion retains frozen snapshot and deterministic conversion', () => {
    // 100 EUR to USD at rate 1.085
    // 100.00 EUR = 10000 minor units
    const origMinor = toMinorUnits('100.00', 'EUR');
    const snapshot = createConversionSnapshot(origMinor, 'EUR', 'USD', '1.085');

    expect(snapshot.originalCurrency).toBe('EUR');
    expect(snapshot.baseCurrency).toBe('USD');
    expect(snapshot.exchangeRate).toBe('1.085');
    expect(snapshot.rateDirection).toBe('1 EUR = 1.085 USD');
    // 100.00 * 1.085 = 108.50 USD = 10850 minor units
    expect(snapshot.baseAmountDecimal).toBe('108.50');
    expect(snapshot.baseAmountMinor).toBe('10850');
  });

  // Scenario 7: Full trip settlement to zero
  test('Scenario 7: Group balances sum to zero, settlement suggestions settle trip to zero', () => {
    // Dinner: A pays INR 3,000 for A, B, C, D, E. Each share is INR 600.
    const totalMinor = toMinorUnits('3000.00', 'INR'); // 300000n
    const members = ['member-A', 'member-B', 'member-C', 'member-D', 'member-E'];
    const split = calculateSplits(totalMinor, 'INR', 'EQUAL', members.map(m => ({ memberId: m })));

    const expense1: ExpenseRecord = {
      _id: 'exp-dinner',
      description: 'Dinner at spice kitchen',
      date: '2026-10-01',
      category: 'Food & Drink',
      originalCurrency: 'INR',
      exchangeRate: '1.0',
      baseCurrency: 'INR',
      baseAmountMinor: '300000',
      isVoided: false,
      payers: [{ memberId: 'member-A', amountMinor: '300000' }],
      participants: split.shares.map(s => ({ memberId: s.memberId, amountMinor: s.amountMinor }))
    };

    const initialBalances = calculateGroupBalances(members, 'INR', [expense1], []);
    expect(initialBalances.isBalanced).toBe(true);

    const balA = initialBalances.memberBalances.find(m => m.memberId === 'member-A')!;
    expect(balA.netBalanceDecimal).toBe('2400.00'); // Receives 2400
    expect(balA.totalPaidDecimal).toBe('3000.00');
    expect(balA.totalShareDecimal).toBe('600.00');

    // Suggestions: B, C, D, E should each pay A 600
    const suggestions = generateSettlementSuggestions(initialBalances.memberBalances, 'INR');
    expect(suggestions).toHaveLength(4);
    for (const sug of suggestions) {
      expect(sug.toMemberId).toBe('member-A');
      expect(sug.amountDecimal).toBe('600.00');
    }

    // Now record repayments for each suggestion
    const settlements: SettlementRecord[] = suggestions.map((s, idx) => ({
      _id: `settlement-${idx}`,
      senderMemberId: s.fromMemberId,
      recipientMemberId: s.toMemberId,
      originalAmountMinor: s.amountMinor,
      originalCurrency: 'INR',
      exchangeRate: '1.0',
      baseAmountMinor: s.amountMinor,
      baseCurrency: 'INR',
      date: '2026-10-02',
      isReversed: false
    }));

    // Recalculate balances after all settlements
    const finalBalances = calculateGroupBalances(members, 'INR', [expense1], settlements);
    expect(finalBalances.isBalanced).toBe(true);

    // Every single member must now be settled with 0.00 net balance!
    for (const m of finalBalances.memberBalances) {
      expect(m.netBalanceDecimal).toBe('0.00');
      expect(m.status).toBe('settled');
    }
  });

  // Scenario 8: Partial repayment reduces debt proportionally
  test('Scenario 8: Partial repayment decreases remaining debt', () => {
    const expense: ExpenseRecord = {
      _id: 'exp-cab',
      description: 'Airport cab',
      date: '2026-10-01',
      category: 'Transportation',
      originalCurrency: 'USD',
      exchangeRate: '1.0',
      baseCurrency: 'USD',
      baseAmountMinor: '10000',
      isVoided: false,
      payers: [{ memberId: 'member-A', amountMinor: '10000' }],
      participants: [
        { memberId: 'member-A', amountMinor: '5000' },
        { memberId: 'member-B', amountMinor: '5000' }
      ]
    };

    // B owes A $50.00. B pays $30.00 as partial repayment.
    const partialSettlement: SettlementRecord = {
      _id: 'settle-partial',
      senderMemberId: 'member-B',
      recipientMemberId: 'member-A',
      originalAmountMinor: '3000',
      originalCurrency: 'USD',
      exchangeRate: '1.0',
      baseAmountMinor: '3000',
      baseCurrency: 'USD',
      date: '2026-10-02',
      isReversed: false
    };

    const balances = calculateGroupBalances(['member-A', 'member-B'], 'USD', [expense], [partialSettlement]);
    expect(balances.isBalanced).toBe(true);

    const balB = balances.memberBalances.find(m => m.memberId === 'member-B')!;
    // Remaining debt should be 50 - 30 = 20
    expect(balB.netBalanceDecimal).toBe('-20.00');
    expect(balB.status).toBe('owes');

    const balA = balances.memberBalances.find(m => m.memberId === 'member-A')!;
    expect(balA.netBalanceDecimal).toBe('20.00');
  });

  // Scenario 9: Voiding an expense removes its impact on balance
  test('Scenario 9: Voided expense is excluded from balances and charts', () => {
    const expense: ExpenseRecord = {
      _id: 'exp-voided',
      description: 'Canceled Tour',
      date: '2026-10-01',
      category: 'Activities',
      originalCurrency: 'USD',
      exchangeRate: '1.0',
      baseCurrency: 'USD',
      baseAmountMinor: '10000',
      isVoided: true,
      payers: [{ memberId: 'member-A', amountMinor: '10000' }],
      participants: [{ memberId: 'member-B', amountMinor: '10000' }]
    };

    const balances = calculateGroupBalances(['member-A', 'member-B'], 'USD', [expense], []);
    expect(balances.isBalanced).toBe(true);

    for (const m of balances.memberBalances) {
      expect(m.netBalanceDecimal).toBe('0.00');
      expect(m.totalPaidDecimal).toBe('0.00');
      expect(m.totalShareDecimal).toBe('0.00');
    }
  });

});
