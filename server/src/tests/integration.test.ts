import request from 'supertest';
import { app } from '../app.js';
import { connectDB, disconnectDB } from '../db.js';

describe('TripSplit API End-to-End Integration Suite', () => {
  let token: string;
  let groupId: string;
  let creatorMemberId: string;
  let aliceMemberId: string;
  let bobMemberId: string;
  let charlieMemberId: string;
  let davidMemberId: string;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  // 1. Auth Flow
  test('User Registration and Login Flow', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Mayank',
        email: 'mayank@example.com',
        password: 'password123',
        preferredCurrency: 'EUR'
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.token).toBeDefined();
    expect(regRes.body.user.email).toBe('mayank@example.com');

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'mayank@example.com',
        password: 'password123'
      });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;
  });

  // 2. Trip Creation
  test('Create a Trip Group with Base Currency EUR', async () => {
    const res = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Eurotrip 2026',
        description: 'Road trip across Italy and France',
        baseCurrency: 'EUR',
        startDate: '2026-06-01',
        endDate: '2026-06-15'
      });

    expect(res.status).toBe(201);
    expect(res.body.group.name).toBe('Eurotrip 2026');
    expect(res.body.group.baseCurrency).toBe('EUR');
    groupId = res.body.group.id;
    creatorMemberId = res.body.group.memberId;
  });

  // 3. Add Guest Members
  test('Add Guests (Alice, Bob, Charlie, David)', async () => {
    const names = ['Alice', 'Bob', 'Charlie', 'David'];
    const memberIds: string[] = [];

    for (const name of names) {
      const res = await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name });

      expect(res.status).toBe(201);
      expect(res.body.member.displayName).toBe(name);
      memberIds.push(res.body.member.memberId);
    }

    [aliceMemberId, bobMemberId, charlieMemberId, davidMemberId] = memberIds;

    const groupDetails = await request(app)
      .get(`/api/v1/groups/${groupId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(groupDetails.body.group.members).toHaveLength(5);
  });

  // 4. Create Equal Split Expense
  test('Record Dinner in Rome: 120.00 EUR paid by Mayank, split equally among all 5', async () => {
    const res = await request(app)
      .post(`/api/v1/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Dinner at Trattoria Roma',
        merchant: 'Trattoria Roma',
        amount: '120.00',
        currency: 'EUR',
        category: 'Food & Drink',
        splitMethod: 'EQUAL',
        payers: [{ memberId: creatorMemberId, amount: '120.00' }],
        participants: [
          { memberId: creatorMemberId },
          { memberId: aliceMemberId },
          { memberId: bobMemberId },
          { memberId: charlieMemberId },
          { memberId: davidMemberId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.expense.originalAmountDecimal).toBe('120.00');
    expect(res.body.expense.participants).toHaveLength(5);
    // 120 / 5 = 24.00 each
    expect(res.body.expense.participants[0].amountDecimal).toBe('24.00');
  });

  // 5. Create Expense with Non-Creator Payer
  test('Record Taxi in Paris: 30.00 EUR paid by Alice, shared between Alice and Bob', async () => {
    const res = await request(app)
      .post(`/api/v1/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Airport Taxi',
        amount: '30.00',
        currency: 'EUR',
        category: 'Transportation',
        splitMethod: 'EQUAL',
        payers: [{ memberId: aliceMemberId, amount: '30.00' }],
        participants: [
          { memberId: aliceMemberId },
          { memberId: bobMemberId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.expense.payers[0].memberId).toBe(aliceMemberId);
    expect(res.body.expense.participants).toHaveLength(2);
    expect(res.body.expense.participants[0].amountDecimal).toBe('15.00');
  });

  // 6. Check Balances & Suggestions
  test('Balances and Settlement Suggestions are mathematically consistent', async () => {
    const res = await request(app)
      .get(`/api/v1/groups/${groupId}/balances`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.isBalanced).toBe(true);

    const mayank = res.body.memberBalances.find((m: any) => m.memberId === creatorMemberId);
    // Mayank paid 120, share 24 -> receives 96.00
    expect(mayank.netBalanceDecimal).toBe('96.00');
    expect(mayank.status).toBe('receives');

    // Alice paid 30, share 24 + 15 = 39 -> owes 9.00
    const alice = res.body.memberBalances.find((m: any) => m.memberId === aliceMemberId);
    expect(alice.netBalanceDecimal).toBe('-9.00');
    expect(alice.status).toBe('owes');

    // Suggestions generated
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });

  // 7. Record Repayment
  test('Record Repayment from David to Mayank (24.00 EUR)', async () => {
    const res = await request(app)
      .post(`/api/v1/groups/${groupId}/settlements`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        senderMemberId: davidMemberId,
        recipientMemberId: creatorMemberId,
        amount: '24.00',
        currency: 'EUR',
        notes: 'Bank transfer for Rome dinner'
      });

    expect(res.status).toBe(201);

    // Verify David balance is now 0.00
    const balRes = await request(app)
      .get(`/api/v1/groups/${groupId}/balances`)
      .set('Authorization', `Bearer ${token}`);

    const david = balRes.body.memberBalances.find((m: any) => m.memberId === davidMemberId);
    expect(david.netBalanceDecimal).toBe('0.00');
    expect(david.status).toBe('settled');
  });

  // 8. Explain Balance Endpoint
  test('Explain Balance endpoint returns itemized ledger for a member', async () => {
    const res = await request(app)
      .get(`/api/v1/groups/${groupId}/balances/${creatorMemberId}/explain`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.explanation.paidExpenses).toHaveLength(1);
    expect(res.body.explanation.repaymentsReceived).toHaveLength(1);
  });

  // 9. Export CSV
  test('Export CSV endpoint returns proper CSV header and rows', async () => {
    const res = await request(app)
      .get(`/api/v1/groups/${groupId}/export`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Date,Category,Description');
    expect(res.text).toContain('Dinner at Trattoria Roma');
  });

  // 10. Security: Unauthorized access blocked
  test('Unauthorized access without token is blocked with 401', async () => {
    const res = await request(app)
      .get(`/api/v1/groups/${groupId}/expenses`);

    expect(res.status).toBe(401);
  });
});
