import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal.js';
import { Avatar } from '../../components/Avatar.js';
import { CURRENCIES, formatCurrencyAmount } from '../../lib/currencies.js';
import { api } from '../../lib/api.js';
import { getCategoryIcon } from '../../components/SpendingByCategoryChart.js';
import { Upload, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Member {
  id: string;
  memberId: string;
  displayName: string;
  color: string;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  baseCurrency: string;
  members: Member[];
  currentMemberId?: string;
  onExpenseAdded: () => void;
}

const CATEGORIES = [
  'Food & Drink',
  'Transportation',
  'Accommodation',
  'Sightseeing',
  'Activities',
  'Groceries',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Other'
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  groupId,
  baseCurrency,
  members,
  currentMemberId,
  onExpenseAdded
}) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food & Drink');
  
  // Payers state
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState(currentMemberId || members[0]?.memberId || '');
  const [customPayers, setCustomPayers] = useState<Record<string, string>>({});

  // Split state
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'>('EQUAL');
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>({});
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [sharesWeights, setSharesWeights] = useState<Record<string, string>>({});

  // Collapsible optional details
  const [showOptional, setShowOptional] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize participants to all members by default
  useEffect(() => {
    if (members.length > 0) {
      const parts: Record<string, boolean> = {};
      const exacts: Record<string, string> = {};
      const percs: Record<string, string> = {};
      const weights: Record<string, string> = {};

      for (const m of members) {
        parts[m.memberId] = true;
        exacts[m.memberId] = '';
        percs[m.memberId] = (100 / members.length).toFixed(1);
        weights[m.memberId] = '1';
      }

      setSelectedParticipants(parts);
      setExactAmounts(exacts);
      setPercentages(percs);
      setSharesWeights(weights);

      if (!singlePayerId) {
        setSinglePayerId(currentMemberId || members[0].memberId);
      }
    }
  }, [members, currentMemberId]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const isMultiCurrency = currency.toUpperCase() !== baseCurrency.toUpperCase();
  const participatingMembers = members.filter(m => selectedParticipants[m.memberId]);

  // Live Split Calculations Preview
  let splitValidationMessage: string | null = null;
  let isSplitValid = true;

  if (numAmount > 0) {
    if (participatingMembers.length === 0) {
      isSplitValid = false;
      splitValidationMessage = 'Select at least one participant.';
    } else if (splitMethod === 'EXACT') {
      const sumExact = participatingMembers.reduce((acc, m) => acc + (parseFloat(exactAmounts[m.memberId]) || 0), 0);
      const diff = Math.round((numAmount - sumExact) * 100) / 100;
      if (Math.abs(diff) > 0.009) {
        isSplitValid = false;
        splitValidationMessage = `Shares total ${sumExact.toFixed(2)}. ${diff > 0 ? `Add ${diff.toFixed(2)}` : `Remove ${Math.abs(diff).toFixed(2)}`} to match ${numAmount.toFixed(2)}.`;
      }
    } else if (splitMethod === 'PERCENTAGE') {
      const sumPerc = participatingMembers.reduce((acc, m) => acc + (parseFloat(percentages[m.memberId]) || 0), 0);
      if (Math.abs(sumPerc - 100) > 0.1) {
        isSplitValid = false;
        splitValidationMessage = `Percentages must total 100%. Current sum: ${sumPerc.toFixed(1)}%.`;
      }
    }
  }

  // Live Multiple Payers Validation
  let payersValidationMessage: string | null = null;
  let isPayersValid = true;
  if (isMultiplePayers && numAmount > 0) {
    const sumPayers = members.reduce((acc, m) => acc + (parseFloat(customPayers[m.memberId]) || 0), 0);
    const diff = Math.round((numAmount - sumPayers) * 100) / 100;
    if (Math.abs(diff) > 0.009) {
      isPayersValid = false;
      payersValidationMessage = `Payer amounts total ${sumPayers.toFixed(2)}. ${diff > 0 ? `Add ${diff.toFixed(2)}` : `Remove ${Math.abs(diff).toFixed(2)}`} to match total bill.`;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter an expense description.');
      return;
    }
    if (!isSplitValid) {
      setError(splitValidationMessage || 'Invalid split allocation.');
      return;
    }
    if (!isPayersValid) {
      setError(payersValidationMessage || 'Invalid payer contributions.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      if (merchant.trim()) formData.append('merchant', merchant.trim());
      formData.append('amount', amount);
      formData.append('currency', currency);
      if (isMultiCurrency) formData.append('exchangeRate', exchangeRate);
      formData.append('date', date);
      formData.append('category', category);
      if (notes.trim()) formData.append('notes', notes.trim());
      formData.append('splitMethod', splitMethod);

      // Payers
      let payersPayload: any[] = [];
      if (!isMultiplePayers) {
        payersPayload = [{ memberId: singlePayerId, amount }];
      } else {
        payersPayload = members
          .filter(m => (parseFloat(customPayers[m.memberId]) || 0) > 0)
          .map(m => ({ memberId: m.memberId, amount: customPayers[m.memberId] }));
      }
      formData.append('payers', JSON.stringify(payersPayload));

      // Participants
      const participantsPayload = participatingMembers.map(m => {
        const item: any = { memberId: m.memberId };
        if (splitMethod === 'EXACT') item.exactAmount = exactAmounts[m.memberId];
        if (splitMethod === 'PERCENTAGE') item.percentage = parseFloat(percentages[m.memberId]) || 0;
        if (splitMethod === 'SHARES') item.shares = parseInt(sharesWeights[m.memberId], 10) || 1;
        return item;
      });
      formData.append('participants', JSON.stringify(participantsPayload));

      // Files
      if (selectedFiles) {
        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append('attachments', selectedFiles[i]);
        }
      }

      await api.expenses.create(groupId, formData);
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Expense"
      maxWidth="620px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            id="btn-save-expense"
            type="submit"
            form="add-expense-form"
            className="btn btn-primary"
            disabled={loading || !isSplitValid || !isPayersValid || numAmount <= 0}
          >
            {loading ? 'Saving...' : 'Save Expense'}
          </button>
        </>
      }
    >
      <form id="add-expense-form" onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-rose-light)',
              color: 'var(--color-rose-text)',
              border: '1px solid var(--color-rose-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.85rem',
              fontSize: '0.84rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Large Focus Amount & Currency Picker */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="form-label">Amount *</label>
            <div className="amount-input-box">
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>
                {CURRENCIES[currency]?.symbol || '$'}
              </span>
              <input
                id="expense-amount-input"
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Currency</label>
            <select
              id="expense-currency-select"
              className="form-select"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              style={{ height: '58px', fontWeight: 600 }}
            >
              {Object.values(CURRENCIES).map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-currency manual exchange rate snapshot */}
        {isMultiCurrency && (
          <div
            style={{
              backgroundColor: 'var(--accent-primary-light)',
              border: '1px solid #C7D2FE',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--accent-primary-text)' }}>
                MULTI-CURRENCY CONVERSION (FROZEN RATE)
              </span>
              <span className="text-xs tabular font-medium">
                ≈ {formatCurrencyAmount(numAmount * (parseFloat(exchangeRate) || 1), baseCurrency)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-sm font-medium">1 {currency} =</span>
              <input
                id="expense-exchange-rate-input"
                type="number"
                step="any"
                min="0.0001"
                className="form-input"
                value={exchangeRate}
                onChange={e => setExchangeRate(e.target.value)}
                style={{ width: '120px', minHeight: '34px', padding: '0.25rem 0.5rem', fontWeight: 600 }}
                required
              />
              <span className="text-sm font-medium">{baseCurrency}</span>
            </div>
          </div>
        )}

        {/* 2. Description and Merchant */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Description *</label>
            <input
              id="expense-desc-input"
              type="text"
              className="form-input"
              placeholder="e.g. Dinner, Taxi, Museum Tickets"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Merchant / Place</label>
            <input
              id="expense-merchant-input"
              type="text"
              className="form-input"
              placeholder="e.g. Trattoria Roma"
              value={merchant}
              onChange={e => setMerchant(e.target.value)}
            />
          </div>
        </div>

        {/* 3. Date & Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Payers Section */}
        <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Who Paid?</label>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsMultiplePayers(!isMultiplePayers)}
              style={{ fontSize: '0.78rem', color: 'var(--accent-primary)' }}
            >
              {isMultiplePayers ? 'Single Payer' : 'Multiple Payers'}
            </button>
          </div>

          {!isMultiplePayers ? (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {members.map(m => {
                const isSelected = singlePayerId === m.memberId;
                return (
                  <button
                    key={m.memberId}
                    type="button"
                    onClick={() => setSinglePayerId(m.memberId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.8rem',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Avatar name={m.displayName} color={m.color} size="sm" />
                    <span className="text-sm font-semibold">{m.displayName}</span>
                    {isSelected && <CheckCircle2 size={16} color="var(--accent-primary)" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {members.map(m => (
                <div key={m.memberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Avatar name={m.displayName} color={m.color} size="sm" />
                    <span className="text-sm font-medium">{m.displayName}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    value={customPayers[m.memberId] || ''}
                    onChange={e => setCustomPayers({ ...customPayers, [m.memberId]: e.target.value })}
                    style={{ width: '120px', minHeight: '36px', textAlign: 'right' }}
                  />
                </div>
              ))}
              {payersValidationMessage && (
                <span className="form-error">{payersValidationMessage}</span>
              )}
            </div>
          )}
        </div>

        {/* 5. Split Section */}
        <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Split Method</label>
            <div className="tab-nav" style={{ gap: '0.25rem' }}>
              {(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  className={`tab-btn btn-sm ${splitMethod === method ? 'active' : ''}`}
                  onClick={() => setSplitMethod(method)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {method.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Participants Checkbox List with Dynamic Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {members.map(m => {
              const isChecked = !!selectedParticipants[m.memberId];
              const isPayer = !isMultiplePayers && singlePayerId === m.memberId;

              // Compute preview amount for this member
              let sharePreview = '0.00';
              if (numAmount > 0 && isChecked) {
                if (splitMethod === 'EQUAL') {
                  sharePreview = (numAmount / Math.max(participatingMembers.length, 1)).toFixed(2);
                } else if (splitMethod === 'EXACT') {
                  sharePreview = exactAmounts[m.memberId] || '0.00';
                } else if (splitMethod === 'PERCENTAGE') {
                  const p = parseFloat(percentages[m.memberId]) || 0;
                  sharePreview = ((numAmount * p) / 100).toFixed(2);
                } else if (splitMethod === 'SHARES') {
                  const totalW = participatingMembers.reduce((acc, part) => acc + (parseInt(sharesWeights[part.memberId], 10) || 1), 0);
                  const w = parseInt(sharesWeights[m.memberId], 10) || 1;
                  sharePreview = ((numAmount * w) / Math.max(totalW, 1)).toFixed(2);
                }
              }

              return (
                <div
                  key={m.memberId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isChecked ? 'var(--bg-subtle)' : 'transparent',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => setSelectedParticipants({ ...selectedParticipants, [m.memberId]: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }}
                    />
                    <Avatar name={m.displayName} color={m.color} size="sm" />
                    <div>
                      <span className="text-sm font-semibold">{m.displayName}</span>
                      {isPayer && <span className="text-xs text-muted" style={{ marginLeft: '0.35rem' }}>(payer)</span>}
                    </div>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isChecked && splitMethod === 'EXACT' && (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        className="form-input"
                        value={exactAmounts[m.memberId] || ''}
                        onChange={e => setExactAmounts({ ...exactAmounts, [m.memberId]: e.target.value })}
                        style={{ width: '100px', minHeight: '34px', textAlign: 'right' }}
                      />
                    )}

                    {isChecked && splitMethod === 'PERCENTAGE' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          className="form-input"
                          value={percentages[m.memberId] || ''}
                          onChange={e => setPercentages({ ...percentages, [m.memberId]: e.target.value })}
                          style={{ width: '70px', minHeight: '34px', textAlign: 'right' }}
                        />
                        <span className="text-xs font-semibold">%</span>
                      </div>
                    )}

                    {isChecked && splitMethod === 'SHARES' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-input"
                          value={sharesWeights[m.memberId] || '1'}
                          onChange={e => setSharesWeights({ ...sharesWeights, [m.memberId]: e.target.value })}
                          style={{ width: '60px', minHeight: '34px', textAlign: 'center' }}
                        />
                        <span className="text-xs text-muted">pts</span>
                      </div>
                    )}

                    <span className="text-sm font-bold tabular" style={{ minWidth: '70px', textAlign: 'right', color: isChecked ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                      {isChecked ? `${CURRENCIES[currency]?.symbol || '$'}${sharePreview}` : 'Excluded'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {splitValidationMessage && (
            <span className="form-error" style={{ display: 'block', marginTop: '0.5rem' }}>
              {splitValidationMessage}
            </span>
          )}

          {splitMethod === 'EQUAL' && numAmount > 0 && participatingMembers.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Deterministic rounding guarantees exact sum total ({CURRENCIES[currency]?.symbol}{numAmount.toFixed(2)}).
            </div>
          )}
        </div>

        {/* 6. Optional Details Collapsible */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowOptional(!showOptional)}
            style={{ width: '100%', justifyContent: 'space-between', padding: '0.5rem' }}
          >
            <span className="font-semibold text-sm">Optional Details (Notes & Receipt Photo/PDF)</span>
            {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showOptional && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Additional context or notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Receipt Attachment (Images or PDF)</label>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                  onChange={e => setSelectedFiles(e.target.files)}
                  style={{ fontSize: '0.85rem' }}
                />
                <span className="form-hint">Max 5 MB. Authorized trip members only.</span>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
