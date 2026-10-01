import React, { useState } from 'react';
import { formatCurrencyAmount } from '../../lib/currencies.js';
import { getCategoryIcon } from '../../components/SpendingByCategoryChart.js';
import { ExpenseDetailModal } from './ExpenseDetailModal.js';
import { Search, Filter, X, Plus, Calendar } from 'lucide-react';

interface ExpenseItem {
  id: string;
  description: string;
  merchant?: string;
  date: string;
  category: string;
  originalAmountDecimal: string;
  originalCurrency: string;
  baseAmountDecimal: string;
  baseCurrency: string;
  exchangeRate: string;
  rateDirection: string;
  splitMethod: string;
  splitExplanation?: string;
  payers: Array<{ memberId: string; amountDecimal: string; baseAmountDecimal: string }>;
  participants: Array<{ memberId: string; amountDecimal: string; baseAmountDecimal: string }>;
  attachments: any[];
  notes?: string;
}

interface Member {
  memberId: string;
  displayName: string;
  color: string;
}

interface ExpenseListProps {
  groupId: string;
  baseCurrency: string;
  expenses: ExpenseItem[];
  members: Member[];
  currentMemberId?: string;
  onRefresh: () => void;
  onAddExpenseClick: () => void;
  initialCategoryFilter?: string;
}

const CATEGORIES = [
  'ALL',
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

export const ExpenseList: React.FC<ExpenseListProps> = ({
  groupId,
  baseCurrency,
  expenses,
  members,
  currentMemberId,
  onRefresh,
  onAddExpenseClick,
  initialCategoryFilter
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryFilter || 'ALL');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  const memberMap = new Map(members.map(m => [m.memberId, m]));

  // Filtering
  const filtered = expenses.filter(exp => {
    if (selectedCategory !== 'ALL' && exp.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = exp.description.toLowerCase().includes(q);
      const matchMerchant = (exp.merchant || '').toLowerCase().includes(q);
      if (!matchDesc && !matchMerchant) return false;
    }
    return true;
  });

  // Group by date
  const groupedByDate: Record<string, ExpenseItem[]> = {};
  for (const exp of filtered) {
    if (!groupedByDate[exp.date]) {
      groupedByDate[exp.date] = [];
    }
    groupedByDate[exp.date].push(exp);
  }

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search expenses by description or merchant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button type="button" className="btn btn-primary" onClick={onAddExpenseClick}>
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="tab-nav" style={{ gap: '0.35rem' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`tab-btn btn-sm ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat !== 'ALL' && getCategoryIcon(cat, 14)}
              <span>{cat === 'ALL' ? 'All Categories' : cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expense List */}
      {sortedDates.length === 0 ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p className="text-muted font-medium">
            {expenses.length === 0
              ? 'No expenses recorded yet. Add your first expense to start tracking!'
              : 'No expenses match your search or filter.'}
          </p>
          {expenses.length === 0 ? (
            <button type="button" className="btn btn-primary" onClick={onAddExpenseClick} style={{ marginTop: '1rem' }}>
              <Plus size={16} />
              <span>Add Expense</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setSelectedCategory('ALL'); }}
              style={{ marginTop: '0.75rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sortedDates.map(dateStr => (
            <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.84rem', fontWeight: 600, paddingLeft: '0.25rem' }}>
                <Calendar size={14} />
                <span>{dateStr}</span>
              </div>

              <div className="card" style={{ padding: '0.5rem 0', overflow: 'hidden' }}>
                {groupedByDate[dateStr].map((exp, idx) => {
                  const firstPayer = exp.payers[0];
                  const payerMember = memberMap.get(firstPayer?.memberId);
                  const isMultiPayer = exp.payers.length > 1;
                  const myShare = exp.participants.find(p => p.memberId === currentMemberId);
                  const isMultiCurrency = exp.originalCurrency !== baseCurrency;

                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExpense(exp)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem',
                        cursor: 'pointer',
                        borderBottom: idx < groupedByDate[dateStr].length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {getCategoryIcon(exp.category, 18)}
                        </div>

                        <div>
                          <h4 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                            {exp.description}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>
                              {isMultiPayer ? 'Multiple payers' : `Paid by ${payerMember?.displayName || 'Member'}`}
                            </span>
                            {exp.merchant && <span>• {exp.merchant}</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className="font-bold text-base tabular" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrencyAmount(exp.originalAmountDecimal, exp.originalCurrency)}
                        </span>

                        <div style={{ fontSize: '0.78rem' }}>
                          {myShare ? (
                            <span className="tabular font-medium text-muted">
                              your share: {formatCurrencyAmount(myShare.amountDecimal, exp.originalCurrency)}
                            </span>
                          ) : (
                            <span className="text-dim">not involved</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          groupId={groupId}
          baseCurrency={baseCurrency}
          members={members}
          currentMemberId={currentMemberId}
          onExpenseVoided={() => {
            setSelectedExpense(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
