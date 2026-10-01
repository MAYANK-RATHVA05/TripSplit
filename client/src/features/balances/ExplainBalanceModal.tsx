import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal.js';
import { Avatar } from '../../components/Avatar.js';
import { formatCurrencyAmount } from '../../lib/currencies.js';
import { api } from '../../lib/api.js';
import { Scale, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';

interface ExplainBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  memberId: string;
  memberName: string;
  memberColor: string;
  baseCurrency: string;
}

export const ExplainBalanceModal: React.FC<ExplainBalanceModalProps> = ({
  isOpen,
  onClose,
  groupId,
  memberId,
  memberName,
  memberColor,
  baseCurrency
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && memberId) {
      setLoading(true);
      api.balances.explain(groupId, memberId)
        .then(res => {
          setData(res.explanation);
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, groupId, memberId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Balance Breakdown: ${memberName}`}
      maxWidth="600px"
      footer={
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
          Close
        </button>
      }
    >
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Calculating balance formula...
        </div>
      ) : !data ? (
        <p className="text-muted">Unable to load explanation.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Formula Card */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Avatar name={memberName} color={memberColor} size="md" />
                <div>
                  <h3 className="font-bold text-lg">{memberName}</h3>
                  <span className="text-xs text-muted">Authoritative Base Balance</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  className="text-2xl font-bold tabular"
                  style={{
                    color:
                      data.status === 'receives'
                        ? 'var(--color-emerald-text)'
                        : data.status === 'owes'
                        ? 'var(--color-rose-text)'
                        : 'var(--text-primary)'
                  }}
                >
                  {data.status === 'receives' && '+'}
                  {formatCurrencyAmount(data.netBalanceDecimal, baseCurrency)}
                </span>
                <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {data.status === 'receives' && 'Should Receive'}
                  {data.status === 'owes' && 'Currently Owes'}
                  {data.status === 'settled' && 'Settled up'}
                </div>
              </div>
            </div>

            {/* Invariant Equation */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.8rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                textAlign: 'center',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <span className="text-dim block">Total Paid (+)</span>
                <strong className="tabular">{formatCurrencyAmount(data.totalPaidDecimal, baseCurrency)}</strong>
              </div>
              <div>
                <span className="text-dim block">Your Share (−)</span>
                <strong className="tabular">{formatCurrencyAmount(data.totalShareDecimal, baseCurrency)}</strong>
              </div>
              <div>
                <span className="text-dim block">Repayments Sent (+)</span>
                <strong className="tabular">{formatCurrencyAmount(data.repaymentsSentDecimal, baseCurrency)}</strong>
              </div>
              <div>
                <span className="text-dim block">Repayments Recv (−)</span>
                <strong className="tabular">{formatCurrencyAmount(data.repaymentsReceivedDecimal, baseCurrency)}</strong>
              </div>
            </div>
          </div>

          {/* Section: Expenses Paid */}
          <div>
            <h4 className="text-sm font-bold" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowUpRight size={16} color="var(--accent-primary)" />
              <span>Expenses Paid ({data.paidExpenses.length})</span>
            </h4>
            {data.paidExpenses.length === 0 ? (
              <p className="text-xs text-muted" style={{ padding: '0.5rem' }}>No expenses paid by this member.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {data.paidExpenses.map((p: any) => (
                  <div
                    key={p.expenseId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.84rem'
                    }}
                  >
                    <div>
                      <span className="font-semibold">{p.description}</span>
                      <span className="text-xs text-muted" style={{ marginLeft: '0.5rem' }}>{p.date}</span>
                    </div>
                    <span className="font-bold tabular">{formatCurrencyAmount(p.baseAmountDecimal, baseCurrency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Personal Shares Allocated */}
          <div>
            <h4 className="text-sm font-bold" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowDownLeft size={16} color="var(--color-rose)" />
              <span>Personal Shares Allocated ({data.shareExpenses.length})</span>
            </h4>
            {data.shareExpenses.length === 0 ? (
              <p className="text-xs text-muted" style={{ padding: '0.5rem' }}>No participating shares for this member.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {data.shareExpenses.map((s: any) => (
                  <div
                    key={s.expenseId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.84rem'
                    }}
                  >
                    <div>
                      <span className="font-semibold">{s.description}</span>
                      <span className="text-xs text-muted" style={{ marginLeft: '0.5rem' }}>{s.date}</span>
                    </div>
                    <span className="font-bold tabular">{formatCurrencyAmount(s.baseShareDecimal, baseCurrency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Repayments / Transfers */}
          {(data.repaymentsSent.length > 0 || data.repaymentsReceived.length > 0) && (
            <div>
              <h4 className="text-sm font-bold" style={{ marginBottom: '0.5rem' }}>Settlement Transfers</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {data.repaymentsSent.map((r: any) => (
                  <div
                    key={r.settlementId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: 'var(--color-emerald-light)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.84rem'
                    }}
                  >
                    <span>Sent repayment to <strong>{r.recipientName}</strong></span>
                    <span className="font-bold tabular">+{formatCurrencyAmount(r.baseAmountDecimal, baseCurrency)}</span>
                  </div>
                ))}

                {data.repaymentsReceived.map((r: any) => (
                  <div
                    key={r.settlementId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.84rem'
                    }}
                  >
                    <span>Received repayment from <strong>{r.senderName}</strong></span>
                    <span className="font-bold tabular">−{formatCurrencyAmount(r.baseAmountDecimal, baseCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
