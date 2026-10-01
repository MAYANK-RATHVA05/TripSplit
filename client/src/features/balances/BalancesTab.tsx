import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar.js';
import { formatCurrencyAmount } from '../../lib/currencies.js';
import { ExplainBalanceModal } from './ExplainBalanceModal.js';
import { RecordRepaymentModal } from './RecordRepaymentModal.js';
import { api } from '../../lib/api.js';
import {
  Scale,
  ArrowRight,
  HelpCircle,
  CheckCircle,
  RotateCcw,
  Sparkles,
  CheckCheck
} from 'lucide-react';

interface MemberBalance {
  memberId: string;
  displayName: string;
  color: string;
  totalPaidDecimal: string;
  totalShareDecimal: string;
  repaymentsSentDecimal: string;
  repaymentsReceivedDecimal: string;
  netBalanceDecimal: string;
  status: 'receives' | 'owes' | 'settled';
}

interface SuggestedTransfer {
  fromMemberId: string;
  fromDisplayName: string;
  fromColor: string;
  toMemberId: string;
  toDisplayName: string;
  toColor: string;
  amountDecimal: string;
  currency: string;
}

interface SettlementItem {
  id: string;
  senderMemberId: string;
  senderDisplayName: string;
  recipientMemberId: string;
  recipientDisplayName: string;
  originalAmountDecimal: string;
  originalCurrency: string;
  baseAmountDecimal: string;
  baseCurrency: string;
  date: string;
  notes?: string;
  isReversed: boolean;
}

interface BalancesTabProps {
  groupId: string;
  baseCurrency: string;
  memberBalances: MemberBalance[];
  suggestions: SuggestedTransfer[];
  settlements: SettlementItem[];
  members: Array<{ memberId: string; displayName: string; color: string }>;
  currentMemberId?: string;
  onRefresh: () => void;
}

export const BalancesTab: React.FC<BalancesTabProps> = ({
  groupId,
  baseCurrency,
  memberBalances,
  suggestions,
  settlements,
  members,
  currentMemberId,
  onRefresh
}) => {
  const [explainMember, setExplainMember] = useState<MemberBalance | null>(null);
  const [repaymentModalOpen, setRepaymentModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedTransfer | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const isFullySettled = suggestions.length === 0 && memberBalances.every(m => m.status === 'settled');

  const handleOpenRepayment = (sug?: SuggestedTransfer) => {
    setSelectedSuggestion(sug || null);
    setRepaymentModalOpen(true);
  };

  const handleReverseSettlement = async (settlementId: string) => {
    if (!window.confirm('Are you sure you want to reverse this repayment record? The balance will revert.')) return;
    setReversingId(settlementId);
    try {
      await api.settlements.reverse(groupId, settlementId);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to reverse repayment.');
    } finally {
      setReversingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Settlement Status Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: isFullySettled ? 'var(--color-emerald-light)' : 'var(--bg-surface)',
          borderColor: isFullySettled ? 'var(--color-emerald-border)' : 'var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: isFullySettled ? 'var(--color-emerald)' : 'var(--accent-primary-light)',
              color: isFullySettled ? '#FFFFFF' : 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isFullySettled ? <CheckCheck size={24} /> : <Scale size={24} />}
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: isFullySettled ? 'var(--color-emerald-text)' : 'var(--text-primary)' }}>
              {isFullySettled ? 'All debts settled to zero!' : 'Outstanding Group Balances'}
            </h3>
            <p className="text-sm text-muted">
              {isFullySettled
                ? 'Everyone is squared up. No remaining transfers are needed.'
                : `${suggestions.length} simplified transfer${suggestions.length > 1 ? 's' : ''} suggested to settle all debts.`}
            </p>
          </div>
        </div>

        {!isFullySettled && (
          <button
            type="button"
            className="btn btn-emerald"
            onClick={() => handleOpenRepayment()}
          >
            <span>Record Repayment</span>
          </button>
        )}
      </div>

      {/* Suggested Settlements Section */}
      {!isFullySettled && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <div>
              <h3 className="font-bold text-base">Suggested Transfers (Simplified Debt)</h3>
              <p className="text-xs text-muted">Mathematically minimizes payments so everyone reaches zero balance</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {suggestions.map((sug, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Avatar name={sug.fromDisplayName} color={sug.fromColor} size="sm" />
                  <span className="text-sm font-semibold">{sug.fromDisplayName}</span>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <Avatar name={sug.toDisplayName} color={sug.toColor} size="sm" />
                  <span className="text-sm font-semibold">{sug.toDisplayName}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className="text-sm font-bold tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrencyAmount(sug.amountDecimal, baseCurrency)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpenRepayment(sug)}
                    style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                  >
                    Settle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Net Balances */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 className="font-bold text-lg">Group Balances</h3>
          <p className="text-sm text-muted">Authoritative net balances in {baseCurrency}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {memberBalances.map(mb => {
            const isMe = mb.memberId === currentMemberId;
            return (
              <div
                key={mb.memberId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isMe ? 'var(--accent-primary-light)' : 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Avatar name={mb.displayName} color={mb.color} size="md" />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="font-bold text-base">{mb.displayName}</span>
                      {isMe && <span className="badge badge-indigo text-xs">You</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Paid: {formatCurrencyAmount(mb.totalPaidDecimal, baseCurrency)} • Share: {formatCurrencyAmount(mb.totalShareDecimal, baseCurrency)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      className="font-bold text-lg tabular"
                      style={{
                        color:
                          mb.status === 'receives'
                            ? 'var(--color-emerald-text)'
                            : mb.status === 'owes'
                            ? 'var(--color-rose-text)'
                            : 'var(--text-muted)'
                      }}
                    >
                      {mb.status === 'receives' && '+'}
                      {formatCurrencyAmount(mb.netBalanceDecimal, baseCurrency)}
                    </span>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {mb.status === 'receives' && <span style={{ color: 'var(--color-emerald-text)' }}>Gets back</span>}
                      {mb.status === 'owes' && <span style={{ color: 'var(--color-rose-text)' }}>Owes</span>}
                      {mb.status === 'settled' && <span className="text-dim">Settled</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExplainMember(mb)}
                    title="Explain balance formula"
                    style={{ padding: '0.4rem', borderRadius: '50%', minHeight: '34px', width: '34px' }}
                  >
                    <HelpCircle size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlement History */}
      {settlements.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 className="font-bold text-base">Recorded Repayments History</h3>
            <p className="text-xs text-muted">Auditable transfer records with reversible corrections</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {settlements.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: s.isReversed ? 'var(--bg-subtle)' : 'var(--color-emerald-light)',
                  border: `1px solid ${s.isReversed ? 'var(--border-subtle)' : 'var(--color-emerald-border)'}`,
                  opacity: s.isReversed ? 0.6 : 1
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                    <strong>{s.senderDisplayName}</strong> paid <strong>{s.recipientDisplayName}</strong>
                    {s.isReversed && <span className="badge badge-rose text-xs">Reversed</span>}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {s.date} {s.notes ? `• "${s.notes}"` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="font-bold text-sm tabular">
                    {formatCurrencyAmount(s.originalAmountDecimal, s.originalCurrency)}
                  </span>

                  {!s.isReversed && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleReverseSettlement(s.id)}
                      disabled={reversingId === s.id}
                      title="Reverse repayment record"
                      style={{ color: 'var(--color-rose-text)', padding: '0.3rem', minHeight: '30px' }}
                    >
                      <RotateCcw size={14} />
                      <span className="text-xs">Reverse</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explain Balance Modal */}
      {explainMember && (
        <ExplainBalanceModal
          isOpen={!!explainMember}
          onClose={() => setExplainMember(null)}
          groupId={groupId}
          memberId={explainMember.memberId}
          memberName={explainMember.displayName}
          memberColor={explainMember.color}
          baseCurrency={baseCurrency}
        />
      )}

      {/* Record Repayment Modal */}
      {repaymentModalOpen && (
        <RecordRepaymentModal
          isOpen={repaymentModalOpen}
          onClose={() => {
            setRepaymentModalOpen(false);
            setSelectedSuggestion(null);
          }}
          groupId={groupId}
          baseCurrency={baseCurrency}
          members={members}
          initialSenderId={selectedSuggestion?.fromMemberId}
          initialRecipientId={selectedSuggestion?.toMemberId}
          initialAmount={selectedSuggestion?.amountDecimal}
          onRepaymentRecorded={() => {
            setRepaymentModalOpen(false);
            setSelectedSuggestion(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
