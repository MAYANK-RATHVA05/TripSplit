import React from 'react';
import { History, Receipt, ArrowRight, UserPlus, FileEdit, Trash2, RotateCcw } from 'lucide-react';

interface ActivityItem {
  id: string;
  actorMemberId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

interface ActivityTabProps {
  activities: ActivityItem[];
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ activities }) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE_EXPENSE': return <Receipt size={16} color="var(--accent-primary)" />;
      case 'UPDATE_EXPENSE': return <FileEdit size={16} color="var(--accent-warning)" />;
      case 'VOID_EXPENSE': return <Trash2 size={16} color="var(--color-rose)" />;
      case 'RECORD_SETTLEMENT': return <ArrowRight size={16} color="var(--color-emerald)" />;
      case 'REVERSE_SETTLEMENT': return <RotateCcw size={16} color="var(--color-rose)" />;
      case 'ADD_MEMBER':
      case 'CLAIM_MEMBERSHIP': return <UserPlus size={16} color="#8B5CF6" />;
      default: return <History size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 className="font-bold text-lg">Activity & Audit History</h3>
        <p className="text-sm text-muted">Complete audit trail of all financial and membership changes</p>
      </div>

      {activities.length === 0 ? (
        <p className="text-muted" style={{ padding: '1rem 0' }}>No activities recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activities.map(act => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)'
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {getActionIcon(act.action)}
              </div>

              <div style={{ flex: 1 }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {act.details}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  <span>by <strong>{act.actorName}</strong></span>
                  <span>•</span>
                  <span>{new Date(act.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
