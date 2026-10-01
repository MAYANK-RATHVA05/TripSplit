import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal.js';
import { Avatar } from '../../components/Avatar.js';
import { CURRENCIES, formatCurrencyAmount } from '../../lib/currencies.js';
import { api } from '../../lib/api.js';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface Member {
  memberId: string;
  displayName: string;
  color: string;
}

interface RecordRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  baseCurrency: string;
  members: Member[];
  initialSenderId?: string;
  initialRecipientId?: string;
  initialAmount?: string;
  onRepaymentRecorded: () => void;
}

export const RecordRepaymentModal: React.FC<RecordRepaymentModalProps> = ({
  isOpen,
  onClose,
  groupId,
  baseCurrency,
  members,
  initialSenderId,
  initialRecipientId,
  initialAmount,
  onRepaymentRecorded
}) => {
  const [senderId, setSenderId] = useState(initialSenderId || members[0]?.memberId || '');
  const [recipientId, setRecipientId] = useState(initialRecipientId || members[1]?.memberId || '');
  const [amount, setAmount] = useState(initialAmount || '');
  const [currency, setCurrency] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSenderId) setSenderId(initialSenderId);
    if (initialRecipientId) setRecipientId(initialRecipientId);
    if (initialAmount) setAmount(initialAmount);
  }, [initialSenderId, initialRecipientId, initialAmount]);

  if (!isOpen) return null;

  const sender = members.find(m => m.memberId === senderId);
  const recipient = members.find(m => m.memberId === recipientId);
  const numAmount = parseFloat(amount) || 0;
  const isMultiCurrency = currency.toUpperCase() !== baseCurrency.toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderId || !recipientId) {
      setError('Select both sender and recipient.');
      return;
    }
    if (senderId === recipientId) {
      setError('Sender and recipient cannot be the same person.');
      return;
    }
    if (numAmount <= 0) {
      setError('Enter a valid repayment amount greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.settlements.record(groupId, {
        senderMemberId: senderId,
        recipientMemberId: recipientId,
        amount,
        currency,
        exchangeRate: isMultiCurrency ? exchangeRate : '1.0',
        date,
        notes: notes.trim()
      });

      onRepaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record repayment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Repayment"
      maxWidth="500px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            form="repayment-form"
            className="btn btn-emerald"
            disabled={loading || numAmount <= 0 || senderId === recipientId}
          >
            {loading ? 'Recording...' : 'Record Repayment'}
          </button>
        </>
      }
    >
      <form id="repayment-form" onSubmit={handleSubmit}>
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

        {/* Sender & Recipient Visual Cards */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.25rem'
          }}
        >
          {/* Sender */}
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Sender (Pays)</label>
            <select
              className="form-select"
              value={senderId}
              onChange={e => setSenderId(e.target.value)}
              style={{ fontWeight: 600, minHeight: '38px', padding: '0.35rem 0.6rem' }}
            >
              {members.map(m => (
                <option key={m.memberId} value={m.memberId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              marginTop: '1.2rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <ArrowRight size={16} />
          </div>

          {/* Recipient */}
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Recipient (Receives)</label>
            <select
              className="form-select"
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              style={{ fontWeight: 600, minHeight: '38px', padding: '0.35rem 0.6rem' }}
            >
              {members.map(m => (
                <option key={m.memberId} value={m.memberId} disabled={m.memberId === senderId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount & Currency */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Payment Amount *</label>
            <div className="amount-input-box">
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>
                {CURRENCIES[currency]?.symbol || '$'}
              </span>
              <input
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

        {/* Multi-currency rate for repayment */}
        {isMultiCurrency && (
          <div
            style={{
              backgroundColor: 'var(--accent-primary-light)',
              border: '1px solid #C7D2FE',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.84rem'
            }}
          >
            <span>Rate: 1 {currency} =</span>
            <input
              type="number"
              step="any"
              className="form-input"
              value={exchangeRate}
              onChange={e => setExchangeRate(e.target.value)}
              style={{ width: '100px', minHeight: '32px', padding: '0.2rem 0.5rem', fontWeight: 600 }}
              required
            />
            <span>{baseCurrency}</span>
          </div>
        )}

        {/* Date and Notes */}
        <div className="form-group">
          <label className="form-label">Payment Date</label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Payment Notes / Reference</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Bank transfer, UPI, Cash paid at cafe"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Information badge */}
        <div
          style={{
            backgroundColor: 'var(--color-emerald-light)',
            border: '1px solid var(--color-emerald-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 0.85rem',
            fontSize: '0.8rem',
            color: 'var(--color-emerald-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>
            Repayments are debt transfers, not expenses. They settle balances without inflating trip spending charts.
          </span>
        </div>
      </form>
    </Modal>
  );
};
