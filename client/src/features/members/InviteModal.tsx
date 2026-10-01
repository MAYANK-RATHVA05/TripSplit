import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal.js';
import { api } from '../../lib/api.js';
import { Copy, Check, Link, Share2 } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  memberId?: string;
  memberName?: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  groupId,
  memberId,
  memberName
}) => {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.members.createInvite(groupId, memberId)
        .then(res => {
          const fullUrl = `${window.location.origin}${res.inviteUrl}`;
          setInviteUrl(fullUrl);
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, groupId, memberId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={memberName ? `Invite ${memberName} to Claim Slot` : 'Invite Friends to Trip'}
      maxWidth="480px"
      footer={
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
          Done
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p className="text-sm text-muted">
          {memberName
            ? `Share this invite link with ${memberName}. When they sign in, their existing expense history and balance will link to their account.`
            : 'Share this link with your friends to let them join this trip group and track their expenses.'}
        </p>

        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Generating secure invite link...
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              className="form-input"
              value={inviteUrl || ''}
              style={{ fontSize: '0.82rem', backgroundColor: 'var(--bg-subtle)' }}
            />
            <button
              type="button"
              className={`btn ${copied ? 'btn-emerald' : 'btn-primary'}`}
              onClick={handleCopy}
              style={{ minWidth: '100px' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        )}

        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          Links expire automatically in 7 days and can only be used once.
        </div>
      </div>
    </Modal>
  );
};
