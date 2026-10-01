import React, { useState } from 'react';
import { Modal } from '../../components/Modal.js';
import { CURRENCIES } from '../../lib/currencies.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: any) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onTripCreated
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseCurrency, setBaseCurrency] = useState(user?.preferredCurrency || 'USD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this trip.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.groups.create({
        name: name.trim(),
        description: description.trim(),
        baseCurrency,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      onTripCreated(data.group);
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      setError(err.message || 'Failed to create trip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Trip"
      footer={
        <>
          <button id="btn-cancel-trip" type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button id="btn-submit-trip" type="submit" form="create-trip-form" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
        </>
      }
    >
      <form id="create-trip-form" onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-rose-light)',
              color: 'var(--color-rose-text)',
              border: '1px solid var(--color-rose-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.85rem',
              fontSize: '0.84rem',
              marginBottom: '1rem'
            }}
          >
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Trip Name *</label>
          <input
            id="trip-name-input"
            type="text"
            className="form-input"
            placeholder="e.g. Eurotrip 2026, Goa Weekend, Tokyo Tour"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description (Optional)</label>
          <input
            id="trip-desc-input"
            type="text"
            className="form-input"
            placeholder="e.g. Friends road trip across Italy and France"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Base Reporting Currency *</label>
          <select
            id="trip-currency-select"
            className="form-select"
            value={baseCurrency}
            onChange={e => setBaseCurrency(e.target.value)}
          >
            {Object.values(CURRENCIES).map(c => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.symbol})
              </option>
            ))}
          </select>
          <span className="form-hint" style={{ marginTop: '0.25rem' }}>
            Base currency drives debt settlement and summary reports. It cannot be changed after expenses are added.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
