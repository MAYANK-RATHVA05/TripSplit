import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Plus, Calendar, Users, Receipt, ArrowRight } from 'lucide-react';

interface TripItem {
  id: string;
  name: string;
  description?: string;
  baseCurrency: string;
  startDate?: string;
  endDate?: string;
  status: string;
  role: string;
  memberId?: string;
  memberCount: number;
  expenseCount: number;
}

interface TripListProps {
  trips: TripItem[];
  onSelectTrip: (tripId: string) => void;
  onCreateTripClick: () => void;
  loading: boolean;
}

export const TripList: React.FC<TripListProps> = ({
  trips,
  onSelectTrip,
  onCreateTripClick,
  loading
}) => {
  const { user } = useAuth();

  return (
    <div className="content-inner" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
          color: '#FFFFFF',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 8px 20px rgba(79, 70, 229, 0.25)',
          border: 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              Welcome back, {user?.name.split(' ')[0]}!
            </h1>
            <p style={{ opacity: 0.88, fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Track expenses, understand your shares, and settle group balances smoothly.
            </p>
          </div>

          <button
            id="btn-create-trip"
            type="button"
            className="btn btn-emerald"
            onClick={onCreateTripClick}
            style={{ fontWeight: 700, padding: '0.75rem 1.25rem' }}
          >
            <Plus size={18} />
            <span>Create New Trip</span>
          </button>
        </div>
      </div>

      {/* Trip List Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-xl font-bold">Your Trips</h2>
          <p className="text-sm text-muted">Select an active trip to record expenses or review balances</p>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ height: 160, opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : trips.length === 0 ? (
        /* Empty State */
        <div
          className="card"
          style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Plus size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold">No trips yet</h3>
            <p className="text-sm text-muted" style={{ maxWidth: '400px', marginTop: '0.25rem' }}>
              Add your first trip to start splitting bills, tracking personal shares, and settling balances with friends.
            </p>
          </div>
          <button id="btn-create-first-trip" type="button" className="btn btn-primary" onClick={onCreateTripClick}>
            <Plus size={16} />
            <span>Create Your First Trip</span>
          </button>
        </div>
      ) : (
        /* Trips Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {trips.map(trip => (
            <div
              key={trip.id}
              className="card card-hover"
              onClick={() => onSelectTrip(trip.id)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {trip.name}
                  </h3>
                  <span className="badge badge-indigo text-xs font-bold">{trip.baseCurrency}</span>
                </div>

                {trip.description && (
                  <p className="text-sm text-muted" style={{ marginTop: '0.35rem', lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {trip.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {trip.startDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} />
                    <span>{trip.startDate} {trip.endDate ? `→ ${trip.endDate}` : ''}</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={15} />
                      <strong>{trip.memberCount}</strong> {trip.memberCount === 1 ? 'member' : 'members'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Receipt size={15} />
                      <strong>{trip.expenseCount}</strong> {trip.expenseCount === 1 ? 'expense' : 'expenses'}
                    </span>
                  </div>

                  <span style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                    Open <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
