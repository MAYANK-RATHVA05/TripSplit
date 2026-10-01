import React, { useState } from 'react';
import { Modal } from '../../components/Modal.js';
import { api } from '../../lib/api.js';
import { UserPlus, AlertCircle } from 'lucide-react';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onGuestAdded: () => void;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({
  isOpen,
  onClose,
  groupId,
  onGuestAdded
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name for the friend.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.members.addGuest(groupId, name.trim());
      setName('');
      onGuestAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add guest friend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Friend as Guest"
      maxWidth="440px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button id="btn-submit-guest" type="submit" form="add-guest-form" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Friend'}
          </button>
        </>
      }
    >
      <form id="add-guest-form" onSubmit={handleSubmit}>
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

        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
          Guests can be tracked in all expenses and split calculations immediately without having an account. They can claim their slot later by invitation.
        </p>

        <div className="form-group">
          <label className="form-label">Friend's Name *</label>
          <input
            id="guest-name-input"
            type="text"
            className="form-input"
            placeholder="e.g. Sarah, Alex, Michael"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            required
          />
        </div>
      </form>
    </Modal>
  );
};
