import React from 'react';
import { formatCurrencyAmount } from '../../lib/currencies.js';
import { SpendingByFriendChart, FriendSpendingItem } from '../../components/SpendingByFriendChart.js';
import { SpendingByCategoryChart, CategorySpendingItem } from '../../components/SpendingByCategoryChart.js';
import { Plus, Download, Receipt, ArrowRight, Wallet, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api.js';

interface TripOverviewTabProps {
  groupId: string;
  tripName: string;
  baseCurrency: string;
  totalSpendDecimal: string;
  myPaidDecimal: string;
  myShareDecimal: string;
  myNetBalanceDecimal: string;
  myStatus: 'receives' | 'owes' | 'settled';
  friendSpending: FriendSpendingItem[];
  categorySpending: CategorySpendingItem[];
  recentExpenses: any[];
  onAddExpenseClick: () => void;
  onViewExpensesTab: () => void;
  onCategorySelected: (cat: string) => void;
}

export const TripOverviewTab: React.FC<TripOverviewTabProps> = ({
  groupId,
  tripName,
  baseCurrency,
  totalSpendDecimal,
  myPaidDecimal,
  myShareDecimal,
  myNetBalanceDecimal,
  myStatus,
  friendSpending,
  categorySpending,
  recentExpenses,
  onAddExpenseClick,
  onViewExpensesTab,
  onCategorySelected
}) => {
  const handleExportCSV = () => {
    window.location.href = api.groups.exportCSVUrl(groupId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Total Trip Spending */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs font-semibold text-muted uppercase">Total Trip Spend</span>
            <Wallet size={16} color="var(--accent-primary)" />
          </div>
          <span className="text-2xl font-bold tabular" style={{ color: 'var(--text-primary)' }}>
            {formatCurrencyAmount(totalSpendDecimal, baseCurrency)}
          </span>
          <span className="text-xs text-dim">All group expenses combined</span>
        </div>

        {/* You Paid */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs font-semibold text-muted uppercase">You Paid</span>
            <TrendingUp size={16} color="var(--accent-primary)" />
          </div>
          <span className="text-2xl font-bold tabular" style={{ color: 'var(--accent-primary)' }}>
            {formatCurrencyAmount(myPaidDecimal, baseCurrency)}
          </span>
          <span className="text-xs text-dim">Total out of pocket</span>
        </div>

        {/* Your Share */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs font-semibold text-muted uppercase">Your Personal Share</span>
            <Receipt size={16} color="#8B5CF6" />
          </div>
          <span className="text-2xl font-bold tabular" style={{ color: 'var(--text-primary)' }}>
            {formatCurrencyAmount(myShareDecimal, baseCurrency)}
          </span>
          <span className="text-xs text-dim">Your true personal consumption</span>
        </div>

        {/* Your Net Balance */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            backgroundColor:
              myStatus === 'receives'
                ? 'var(--color-emerald-light)'
                : myStatus === 'owes'
                ? 'var(--color-rose-light)'
                : 'var(--bg-surface)',
            borderColor:
              myStatus === 'receives'
                ? 'var(--color-emerald-border)'
                : myStatus === 'owes'
                ? 'var(--color-rose-border)'
                : 'var(--border-subtle)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs font-semibold uppercase" style={{ color: myStatus === 'receives' ? 'var(--color-emerald-text)' : myStatus === 'owes' ? 'var(--color-rose-text)' : 'var(--text-muted)' }}>
              Your Net Balance
            </span>
          </div>
          <span
            className="text-2xl font-bold tabular"
            style={{
              color:
                myStatus === 'receives'
                  ? 'var(--color-emerald-text)'
                  : myStatus === 'owes'
                  ? 'var(--color-rose-text)'
                  : 'var(--text-primary)'
            }}
          >
            {myStatus === 'receives' && '+'}
            {formatCurrencyAmount(myNetBalanceDecimal, baseCurrency)}
          </span>
          <span className="text-xs font-medium" style={{ color: myStatus === 'receives' ? 'var(--color-emerald-text)' : myStatus === 'owes' ? 'var(--color-rose-text)' : 'var(--text-muted)' }}>
            {myStatus === 'receives' && 'You should receive this back'}
            {myStatus === 'owes' && 'You owe this amount to the group'}
            {myStatus === 'settled' && 'You are completely settled up'}
          </span>
        </div>
      </div>

      {/* Two MVP Visual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* MVP Chart 1: Spending by Friend */}
        <SpendingByFriendChart data={friendSpending} baseCurrency={baseCurrency} />

        {/* MVP Chart 2: Spending by Category */}
        <SpendingByCategoryChart
          data={categorySpending}
          totalSpendDecimal={totalSpendDecimal}
          baseCurrency={baseCurrency}
          onSelectCategory={cat => {
            onCategorySelected(cat);
            onViewExpensesTab();
          }}
        />
      </div>

      {/* Quick Action Toolbar & Recent Expenses */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="font-bold text-lg">Recent Expenses</h3>
            <p className="text-sm text-muted">Latest bills recorded for {tripName}</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onAddExpenseClick}>
              <Plus size={15} />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {recentExpenses.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <p className="text-muted">No expenses recorded yet.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onAddExpenseClick} style={{ marginTop: '0.75rem' }}>
              <Plus size={14} /> Add First Expense
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentExpenses.slice(0, 5).map((exp, idx) => (
              <div
                key={exp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0',
                  borderBottom: idx < Math.min(recentExpenses.length, 5) - 1 ? '1px solid var(--border-subtle)' : 'none'
                }}
              >
                <div>
                  <h4 className="font-semibold text-sm">{exp.description}</h4>
                  <span className="text-xs text-muted">{exp.date} • {exp.category}</span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="font-bold text-sm tabular">
                    {formatCurrencyAmount(exp.originalAmountDecimal, exp.originalCurrency)}
                  </span>
                </div>
              </div>
            ))}

            {recentExpenses.length > 5 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onViewExpensesTab}
                style={{ marginTop: '0.5rem', alignSelf: 'center', color: 'var(--accent-primary)', fontWeight: 600 }}
              >
                <span>View all {recentExpenses.length} expenses</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
