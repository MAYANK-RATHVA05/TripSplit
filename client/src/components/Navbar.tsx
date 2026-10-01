import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Avatar } from './Avatar.js';
import {
  Compass,
  CreditCard,
  Scale,
  Users,
  History,
  Plus,
  LogOut,
  ChevronLeft
} from 'lucide-react';

export type ActiveTab = 'overview' | 'expenses' | 'balances' | 'members' | 'activity';

interface NavbarProps {
  currentTrip?: {
    id: string;
    name: string;
    baseCurrency: string;
    role: string;
  } | null;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onBackToTrips: () => void;
  onAddExpenseClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTrip,
  activeTab,
  onTabChange,
  onBackToTrips,
  onAddExpenseClick
}) => {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Top Application Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 800,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentTrip ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onBackToTrips}
              title="Back to all trips"
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <ChevronLeft size={20} />
              <span className="font-semibold text-sm">All Trips</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)'
                }}
              >
                <Compass size={20} />
              </div>
              <span className="font-bold text-xl display-font">TripSplit</span>
            </div>
          )}

          {currentTrip && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.75rem' }}>
              <span className="font-bold text-lg" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTrip.name}
              </span>
              <span className="badge badge-indigo text-xs">{currentTrip.baseCurrency}</span>
            </div>
          )}
        </div>

        {/* Right side Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentTrip && (
            <button
              id="btn-header-add-expense"
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAddExpenseClick}
              style={{ boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)' }}
            >
              <Plus size={16} />
              <span>Add Expense</span>
            </button>
          )}

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Avatar name={user.name} size="sm" />
              <button
                id="btn-logout"
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={logout}
                title="Log out"
                style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Desktop Sub-navigation Tabs when viewing a Trip */}
      {currentTrip && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0.5rem 1.25rem',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div className="tab-nav">
            <button
              id="nav-tab-overview"
              type="button"
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => onTabChange('overview')}
            >
              <Compass size={16} />
              <span>Overview</span>
            </button>
            <button
              id="nav-tab-expenses"
              type="button"
              className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => onTabChange('expenses')}
            >
              <CreditCard size={16} />
              <span>Expenses</span>
            </button>
            <button
              id="nav-tab-balances"
              type="button"
              className={`tab-btn ${activeTab === 'balances' ? 'active' : ''}`}
              onClick={() => onTabChange('balances')}
            >
              <Scale size={16} />
              <span>Balances</span>
            </button>
            <button
              id="nav-tab-members"
              type="button"
              className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => onTabChange('members')}
            >
              <Users size={16} />
              <span>Members</span>
            </button>
            <button
              id="nav-tab-activity"
              type="button"
              className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => onTabChange('activity')}
            >
              <History size={16} />
              <span>Activity</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      {currentTrip && (
        <nav className="bottom-nav">
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => onTabChange('overview')}
          >
            <Compass size={20} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => onTabChange('expenses')}
          >
            <CreditCard size={20} />
            <span>Expenses</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'balances' ? 'active' : ''}`}
            onClick={() => onTabChange('balances')}
          >
            <Scale size={20} />
            <span>Balances</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => onTabChange('members')}
          >
            <Users size={20} />
            <span>Members</span>
          </button>
        </nav>
      )}
    </>
  );
};
