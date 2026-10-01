import React, { useState } from 'react';
import { formatCurrencyAmount } from '../lib/currencies.js';
import { Avatar } from './Avatar.js';
import { Table, BarChart2 } from 'lucide-react';

export interface FriendSpendingItem {
  memberId: string;
  displayName: string;
  color: string;
  paidDecimal: string;
  paidNumber: number;
  shareDecimal: string;
  shareNumber: number;
  expenseCount: number;
  netBalanceDecimal: string;
  status: 'receives' | 'owes' | 'settled';
}

interface Props {
  data: FriendSpendingItem[];
  baseCurrency: string;
}

export const SpendingByFriendChart: React.FC<Props> = ({ data, baseCurrency }) => {
  const [showTable, setShowTable] = useState(false);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="text-muted">No spending records to display yet.</p>
      </div>
    );
  }

  // Find max value across all paid and share amounts to scale horizontal bars
  const maxVal = Math.max(...data.map(d => Math.max(d.paidNumber, d.shareNumber)), 1);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 className="font-bold text-lg">Spending by Friend</h3>
          <p className="text-sm text-muted">Amount Paid vs Personal Share in {baseCurrency}</p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowTable(!showTable)}
        >
          {showTable ? <BarChart2 size={16} /> : <Table size={16} />}
          <span>{showTable ? 'View Chart' : 'View Table'}</span>
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.84rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#4F46E5' }} />
          <span className="font-medium">Amount Paid</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#10B981' }} />
          <span className="font-medium">Personal Share</span>
        </div>
      </div>

      {!showTable ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
          {data.map(item => {
            const paidPct = Math.max((item.paidNumber / maxVal) * 100, item.paidNumber > 0 ? 3 : 0);
            const sharePct = Math.max((item.shareNumber / maxVal) * 100, item.shareNumber > 0 ? 3 : 0);
            const isHovered = hoveredMember === item.memberId;

            return (
              <div
                key={item.memberId}
                onMouseEnter={() => setHoveredMember(item.memberId)}
                onMouseLeave={() => setHoveredMember(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isHovered ? 'var(--bg-subtle)' : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Avatar name={item.displayName} color={item.color} size="sm" />
                    <span className="font-semibold text-sm">{item.displayName}</span>
                    <span className="text-xs text-dim">({item.expenseCount} expenses)</span>
                  </div>

                  {/* Net Balance badge */}
                  <span
                    className={`badge badge-${item.status === 'receives' ? 'emerald' : item.status === 'owes' ? 'rose' : 'neutral'}`}
                  >
                    {item.status === 'receives' && `Gets ${formatCurrencyAmount(item.netBalanceDecimal, baseCurrency)}`}
                    {item.status === 'owes' && `Owes ${formatCurrencyAmount(item.netBalanceDecimal.replace('-', ''), baseCurrency)}`}
                    {item.status === 'settled' && 'Settled up'}
                  </span>
                </div>

                {/* Grouped Horizontal Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  {/* Paid Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, backgroundColor: 'var(--border-subtle)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${paidPct}%`,
                          height: '100%',
                          backgroundColor: '#4F46E5',
                          borderRadius: 4,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                    <span className="text-xs tabular font-medium" style={{ minWidth: 65, textAlign: 'right' }}>
                      {formatCurrencyAmount(item.paidDecimal, baseCurrency)}
                    </span>
                  </div>

                  {/* Share Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, backgroundColor: 'var(--border-subtle)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${sharePct}%`,
                          height: '100%',
                          backgroundColor: '#10B981',
                          borderRadius: 4,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                    <span className="text-xs tabular font-medium" style={{ minWidth: 65, textAlign: 'right', color: 'var(--color-emerald-text)' }}>
                      {formatCurrencyAmount(item.shareDecimal, baseCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Accessible Table View */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.5rem 0.25rem' }}>Friend</th>
                <th style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>Amount Paid</th>
                <th style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>Personal Share</th>
                <th style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>Expenses</th>
                <th style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.memberId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.6rem 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Avatar name={item.displayName} color={item.color} size="sm" />
                    <span className="font-semibold">{item.displayName}</span>
                  </td>
                  <td style={{ padding: '0.6rem 0.25rem', textAlign: 'right' }} className="tabular font-medium">
                    {formatCurrencyAmount(item.paidDecimal, baseCurrency)}
                  </td>
                  <td style={{ padding: '0.6rem 0.25rem', textAlign: 'right' }} className="tabular font-medium">
                    {formatCurrencyAmount(item.shareDecimal, baseCurrency)}
                  </td>
                  <td style={{ padding: '0.6rem 0.25rem', textAlign: 'right' }}>{item.expenseCount}</td>
                  <td style={{ padding: '0.6rem 0.25rem', textAlign: 'right' }} className="tabular font-semibold">
                    <span
                      style={{
                        color: item.status === 'receives' ? 'var(--color-emerald-text)' : item.status === 'owes' ? 'var(--color-rose-text)' : 'inherit'
                      }}
                    >
                      {item.status === 'receives' && '+'}
                      {formatCurrencyAmount(item.netBalanceDecimal, baseCurrency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
