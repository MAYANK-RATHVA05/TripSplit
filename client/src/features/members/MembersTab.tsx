import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar.js';
import { AddGuestModal } from './AddGuestModal.js';
import { InviteModal } from './InviteModal.js';
import { UserPlus, Link, Shield, User, Share2 } from 'lucide-react';

interface Member {
  id: string;
  memberId: string;
  displayName: string;
  email?: string;
  isGuest: boolean;
  role: 'owner' | 'member';
  color: string;
  joinedAt: string;
}

interface MembersTabProps {
  groupId: string;
  members: Member[];
  currentMemberId?: string;
  onRefresh: () => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  groupId,
  members,
  currentMemberId,
  onRefresh
}) => {
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [targetMemberForInvite, setTargetMemberForInvite] = useState<Member | null>(null);

  const handleInviteSpecific = (member: Member) => {
    setTargetMemberForInvite(member);
    setInviteModalOpen(true);
  };

  const handleGeneralInvite = () => {
    setTargetMemberForInvite(null);
    setInviteModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header with Add / Invite buttons */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 className="font-bold text-lg">Trip Members ({members.length})</h3>
          <p className="text-sm text-muted">Friends participating in expenses and settlement calculations</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleGeneralInvite}>
            <Link size={16} />
            <span>Invite Link</span>
          </button>
          <button id="btn-add-friend-tab" type="button" className="btn btn-primary btn-sm" onClick={() => setAddGuestOpen(true)}>
            <UserPlus size={16} />
            <span>Add Friend</span>
          </button>
        </div>
      </div>

      {/* Members Grid / List */}
      <div className="card" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
        {members.map((member, idx) => {
          const isMe = member.memberId === currentMemberId;
          return (
            <div
              key={member.memberId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderBottom: idx < members.length - 1 ? '1px solid var(--border-subtle)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Avatar name={member.displayName} color={member.color} size="md" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="font-bold text-base">{member.displayName}</span>
                    {isMe && <span className="badge badge-indigo text-xs">You</span>}
                    {member.role === 'owner' && (
                      <span className="badge badge-neutral text-xs" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Shield size={12} /> Owner
                      </span>
                    )}
                    {member.isGuest && (
                      <span className="badge badge-amber text-xs">Guest</span>
                    )}
                  </div>
                  {member.email && (
                    <span className="text-xs text-muted">{member.email}</span>
                  )}
                </div>
              </div>

              <div>
                {member.isGuest && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleInviteSpecific(member)}
                    title="Send link for friend to claim this membership"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <Share2 size={14} />
                    <span>Send Claim Link</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Guest Modal */}
      {addGuestOpen && (
        <AddGuestModal
          isOpen={addGuestOpen}
          onClose={() => setAddGuestOpen(false)}
          groupId={groupId}
          onGuestAdded={() => {
            onRefresh();
          }}
        />
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <InviteModal
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setTargetMemberForInvite(null);
          }}
          groupId={groupId}
          memberId={targetMemberForInvite?.memberId}
          memberName={targetMemberForInvite?.displayName}
        />
      )}
    </div>
  );
};
