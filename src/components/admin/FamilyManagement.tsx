import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import type { FamilyRole, FamilyMember } from '../../types';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Key,
  CheckCircle2,
  Ban,
  X,
  Crown,
  Eye,
  EyeOff,
  UserCheck,
  Lock,
  Sparkles,
} from 'lucide-react';

export function FamilyManagement() {
  const {
    allMembers,
    invitations,
    currentMember,
    inviteMember,
    cancelInvitation,
    updateMemberRole,
    toggleMemberSuspension,
    switchActiveMember,
    changeMemberPassword,
  } = useVaultStore();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>('member');

  // Password Change Modal State
  const [passwordModalMember, setPasswordModalMember] = useState<FamilyMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    inviteMember(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
    setIsInviteOpen(false);
  };

  const handleOpenPasswordModal = (member: FamilyMember) => {
    setPasswordModalMember(member);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccessMessage(null);
  };

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long for vault cryptographic security.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!passwordModalMember) return;

    const success = await changeMemberPassword(passwordModalMember.id, newPassword);
    if (success) {
      setPasswordSuccessMessage(`New security passphrase securely configured for ${passwordModalMember.displayName}!`);
      setTimeout(() => {
        setPasswordModalMember(null);
        setPasswordSuccessMessage(null);
      }, 1400);
    }
  };

  const isOwnerOrAdmin = currentMember.role === 'owner' || currentMember.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Banner with Governance Overview */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4 shadow-xl">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-vault-gold/15 border border-vault-gold/30 text-vault-gold">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-white tracking-wide">
              Family Members & Access Governance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Private vault governance with zero-knowledge cryptographic access. Every kin can manage credentials.
            </p>
          </div>
        </div>

        {isOwnerOrAdmin && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Family Member</span>
          </button>
        )}
      </div>

      {/* Interactive Persona / Active Identity Switcher */}
      <div className="bg-[#0b0e17]/80 backdrop-blur-xl p-3 sm:p-4 rounded-3xl border border-white/10 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <UserCheck className="w-4 h-4 text-vault-gold" />
            <span className="text-xs font-bold text-slate-200">Active Test Persona:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15">
              {currentMember.displayName} ({currentMember.role.toUpperCase()})
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] text-slate-400 mr-1">Switch Persona:</span>
            {allMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => switchActiveMember(member.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  currentMember.id === member.id
                    ? 'bg-vault-gold text-black font-bold shadow'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {member.displayName.split(' ')[0]} ({member.role})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enrolled Family Members Circle */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-vault-gold flex items-center gap-2">
          <span>Enrolled Family Circle ({allMembers.length})</span>
          <span className="text-xs text-slate-500 font-normal">
            (Any member can set & change their password below)
          </span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allMembers.map((member) => {
            const isSelf = member.id === currentMember.id;
            return (
              <div
                key={member.id}
                className={`glass-panel p-3.5 sm:p-4 rounded-3xl border transition-all ${
                  isSelf ? 'border-vault-gold/40 shadow-glow' : 'border-white/5'
                } flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4`}
              >
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div className="relative flex-shrink-0">
                    <img
                      src={member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'}
                      alt={member.displayName}
                      className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-cover border border-white/20 bg-slate-900"
                    />
                    {member.role === 'owner' && (
                      <div className="absolute -top-1 -right-1 p-1 bg-amber-400 rounded-full text-slate-950 shadow-md">
                        <Crown className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white truncate">{member.displayName}</h4>
                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          You
                        </span>
                      )}
                      {member.status === 'suspended' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{member.email}</p>
                    <div className="flex items-center gap-2.5 sm:gap-3 mt-1 text-[11px] text-slate-500 font-sans">
                      <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                      {member.passwordLastChanged && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          <span>Pass set</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Member Access Tools & Password Change Button */}
                <div className="flex items-center flex-wrap gap-2 justify-between sm:justify-end w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  {/* Change Password Button (Active for all members) */}
                  <button
                    onClick={() => handleOpenPasswordModal(member)}
                    title="Change & Update Security Password"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-all shadow"
                  >
                    <Key className="w-3.5 h-3.5 text-vault-gold" />
                    <span>Change Pass</span>
                  </button>

                  {/* Role Dropdown / Badge */}
                  {isOwnerOrAdmin && !isSelf && member.role !== 'owner' ? (
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value as FamilyRole)}
                      className="glass-input p-1.5 rounded-xl text-xs font-mono text-vault-gold bg-slate-900 border border-white/15 cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-semibold text-vault-gold">
                      {member.role.toUpperCase()}
                    </span>
                  )}

                  {/* Suspension Toggle */}
                  {isOwnerOrAdmin && !isSelf && member.role !== 'owner' && (
                    <button
                      onClick={() => toggleMemberSuspension(member.id)}
                      className={`p-2 rounded-xl border text-xs transition-colors ${
                        member.status === 'active'
                          ? 'border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30'
                          : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                      }`}
                      title={member.status === 'active' ? 'Suspend Access' : 'Reactivate Access'}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-vault-gold flex items-center gap-2">
            <Mail className="w-4 h-4 text-vault-gold" />
            <span>Pending Vault Invitations ({invitations.length})</span>
          </h3>

          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="glass-panel p-3.5 rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{inv.email}</div>
                    <div className="text-[11px] text-slate-500">
                      Invited by {inv.invitedByName} as {inv.role} • Expires in 7 days
                    </div>
                  </div>
                </div>

                {isOwnerOrAdmin && (
                  <button
                    onClick={() => cancelInvitation(inv.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-all"
                  >
                    Cancel Invitation
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECURE PASSWORD / PASSPHRASE CHANGE MODAL */}
      {passwordModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0b0e17] border border-white/15 w-full max-w-md rounded-3xl p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setPasswordModalMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-vault-gold/15 text-vault-gold border border-vault-gold/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-serif">
                  Set / Change Password
                </h3>
                <p className="text-xs text-slate-400">
                  Configuring credentials for <span className="text-white font-semibold">{passwordModalMember.displayName}</span>
                </p>
              </div>
            </div>

            {passwordSuccessMessage ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 animate-in zoom-in-95">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                <h4 className="text-sm font-bold text-white">Password Updated Successfully</h4>
                <p className="text-xs text-slate-400 max-w-xs">{passwordSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPasswordChange} className="space-y-4 mt-4 font-sans">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-300 block mb-1">New Vault Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 8 characters..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="glass-input w-full p-2.5 pr-10 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input w-full p-2.5 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-vault-gold font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cryptographic Security Notice</span>
                  </div>
                  <p>
                    Passwords are used to wrap and decrypt the master family vault key with AES-256-GCM client-side. Zero plaintext passwords ever touch cloud servers.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPasswordModalMember(null)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all"
                  >
                    Update Password & Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* INVITE KIN MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0b0e17] border border-white/15 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => setIsInviteOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 font-serif">Invite Family Member</h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Send a secure one-time cryptographic enrollment link to kin.
            </p>

            <form onSubmit={handleSendInvite} className="space-y-4 font-sans">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="family.member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="glass-input w-full p-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Vault Role & Privileges</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as FamilyRole)}
                  className="glass-input w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-white/15 cursor-pointer"
                >
                  <option value="admin">Admin (Manage photos, albums & invite kin)</option>
                  <option value="member">Member (Upload memories & create albums)</option>
                  <option value="viewer">Viewer (Read-only access to decrypted memories)</option>
                </select>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all"
                >
                  Issue Invitation Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
