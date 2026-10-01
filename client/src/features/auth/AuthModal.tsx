import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { CURRENCIES } from '../../lib/currencies.js';
import { Compass, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name.');
        await register(name.trim(), email.trim(), password, preferredCurrency);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
      <div className="modal-content" style={{ maxWidth: '440px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Compass size={28} />
          </div>
          <h1 className="text-2xl font-bold">TripSplit</h1>
          <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
            Share travel expenses without confusion
          </p>
        </div>

        {/* Tab switch between Login and Register */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            marginBottom: '1.25rem'
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { setIsRegister(false); setError(null); }}
            style={{
              flex: 1,
              backgroundColor: !isRegister ? 'var(--bg-surface)' : 'transparent',
              color: !isRegister ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: !isRegister ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { setIsRegister(true); setError(null); }}
            style={{
              flex: 1,
              backgroundColor: isRegister ? 'var(--bg-surface)' : 'transparent',
              color: isRegister ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: isRegister ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

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

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Mayank Rathva"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Preferred Currency</label>
              <select
                className="form-select"
                value={preferredCurrency}
                onChange={e => setPreferredCurrency(e.target.value)}
              >
                {Object.values(CURRENCIES).map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', minHeight: '46px' }}
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
