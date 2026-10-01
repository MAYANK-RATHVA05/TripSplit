import React, { useState } from 'react';
import { Modal } from '../../components/Modal.js';
import { Avatar } from '../../components/Avatar.js';
import { formatCurrencyAmount } from '../../lib/currencies.js';
import { getCategoryIcon } from '../../components/SpendingByCategoryChart.js';
import { api } from '../../lib/api.js';
import { Trash2, Calendar, FileText, ArrowRight, AlertTriangle } from 'lucide-react';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
  groupId: string;
  baseCurrency: string;
  members: Array<{ memberId: string; displayName: string; color: string }>;
  currentMemberId?: string;
  onExpenseVoided: () => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  groupId,
  baseCurrency,
  members,
  currentMemberId,
  onExpenseVoided
}) => {
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !expense) return null;

  const memberMap = new Map(members.map(m => [m.memberId, m]));

  const handleVoid = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.expenses.void(groupId, expense.id);
      onExpenseVoided();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to void expense.');
      setLoading(false);
    }
  };

  const isMultiCurrency = expense.originalCurrency !== baseCurrency;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Expense Details"
      maxWidth="560px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          {!confirmVoid ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmVoid(true)}
            >
              <Trash2 size={16} />
              <span>Void Expense</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-xs text-dim">Reverse balance effect?</span>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleVoid}
                disabled={loading}
              >
                {loading ? 'Voiding...' : 'Yes, Void'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmVoid(false)}
              >
                Cancel
              </button>
            </div>
          )}

          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-rose-light)',
              color: 'var(--color-rose-text)',
              border: '1px solid var(--color-rose-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.85rem',
              fontSize: '0.84rem'
            }}
          >
            {error}
          </div>
        )}

        {/* Expense Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subtle)',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                {getCategoryIcon(expense.category, 14)}
                <span>{expense.category}</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} />
                {expense.date}
              </span>
            </div>

            <h3 className="text-xl font-bold">{expense.description}</h3>
            {expense.merchant && (
              <p className="text-sm text-muted">at {expense.merchant}</p>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="text-2xl font-bold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatCurrencyAmount(expense.originalAmountDecimal, expense.originalCurrency)}
            </span>
            {isMultiCurrency && (
              <p className="text-xs text-muted tabular">
                ≈ {formatCurrencyAmount(expense.baseAmountDecimal, baseCurrency)} ({expense.rateDirection})
              </p>
            )}
          </div>
        </div>

        {/* Plain-Language Balance Effect */}
        {currentMemberId && (
          <div
            style={{
              backgroundColor: 'var(--accent-primary-light)',
              border: '1px solid #C7D2FE',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem'
            }}
          >
            {(() => {
              const myPayer = expense.payers.find((p: any) => p.memberId === currentMemberId);
              const myPart = expense.participants.find((p: any) => p.memberId === currentMemberId);
              const paidBase = myPayer ? parseFloat(myPayer.baseAmountDecimal) : 0;
              const shareBase = myPart ? parseFloat(myPart.baseAmountDecimal) : 0;
              const netBase = paidBase - shareBase;

              if (paidBase === 0 && shareBase === 0) {
                return <span>You did not participate in or pay for this expense.</span>;
              }
              if (netBase > 0) {
                return (
                  <span>
                    You paid <strong>{formatCurrencyAmount(paidBase, baseCurrency)}</strong> and your share is <strong>{formatCurrencyAmount(shareBase, baseCurrency)}</strong>. You are owed <strong>{formatCurrencyAmount(netBase, baseCurrency)}</strong> for this expense.
                  </span>
                );
              }
              if (netBase < 0) {
                return (
                  <span>
                    You paid <strong>{formatCurrencyAmount(paidBase, baseCurrency)}</strong> and your share is <strong>{formatCurrencyAmount(shareBase, baseCurrency)}</strong>. You owe <strong>{formatCurrencyAmount(Math.abs(netBase), baseCurrency)}</strong> for this expense.
                  </span>
                );
              }
              return (
                <span>
                  You paid <strong>{formatCurrencyAmount(paidBase, baseCurrency)}</strong> which exactly covers your share. Net balance effect is zero.
                </span>
              );
            })()}
          </div>
        )}

        {/* Payers Breakdown */}
        <div>
          <h4 className="text-sm font-bold" style={{ marginBottom: '0.5rem' }}>Paid By</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {expense.payers.map((p: any) => {
              const m = memberMap.get(p.memberId);
              return (
                <div
                  key={p.memberId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Avatar name={m?.displayName || 'Member'} color={m?.color} size="sm" />
                    <span className="text-sm font-semibold">{m?.displayName || 'Member'}</span>
                  </div>
                  <span className="text-sm font-bold tabular">
                    {formatCurrencyAmount(p.amountDecimal, expense.originalCurrency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Participant Shares Breakdown */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 className="text-sm font-bold">Split Allocation ({expense.splitMethod.toLowerCase()})</h4>
            {expense.splitExplanation && (
              <span className="text-xs text-muted">{expense.splitExplanation}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {expense.participants.map((p: any) => {
              const m = memberMap.get(p.memberId);
              return (
                <div
                  key={p.memberId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Avatar name={m?.displayName || 'Member'} color={m?.color} size="sm" />
                    <span className="text-sm font-medium">{m?.displayName || 'Member'}</span>
                    {p.percentage !== undefined && (
                      <span className="text-xs text-muted">({p.percentage}%)</span>
                    )}
                    {p.shares !== undefined && (
                      <span className="text-xs text-muted">({p.shares} shares)</span>
                    )}
                  </div>
                  <span className="text-sm font-bold tabular">
                    {formatCurrencyAmount(p.amountDecimal, expense.originalCurrency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes & Attachments */}
        {expense.notes && (
          <div>
            <h4 className="text-sm font-bold" style={{ marginBottom: '0.25rem' }}>Notes</h4>
            <p className="text-sm text-secondary" style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
              {expense.notes}
            </p>
          </div>
        )}

        {expense.attachments && expense.attachments.length > 0 && (
          <div>
            <h4 className="text-sm font-bold" style={{ marginBottom: '0.5rem' }}>Receipts & Attachments</h4>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {expense.attachments.map((att: any, idx: number) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.84rem',
                    fontWeight: 600
                  }}
                >
                  <FileText size={16} />
                  <span>{att.originalName}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
