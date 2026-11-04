import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import type { FamilyRole, FamilyMember } from '../../types';
import { vaultAudio } from '../../services/audioSynthesizer';
import { PasswordGeneratorModal } from '../security/PasswordGeneratorModal';
import { UserProfileModal } from '../profile/UserProfileModal';
import { getVaultJoinUrl, extractAndNormalizeInviteCode } from '../../utils/inviteUtils';
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
  Copy,
  Check,
  Camera,
  Ticket,
  Link,
  RefreshCw,
  Edit3,
} from 'lucide-react';

export function FamilyManagement() {
  const {
    allMembers,
    invitations,
    currentMember,
    inviteMember,
    acceptInvitation,
    cancelInvitation,
    updateMemberRole,
    toggleMemberSuspension,
    switchActiveMember,
    changeMemberPassword,
  } = useVaultStore();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<'create' | 'join'>('create');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>('member');
  const [inviteExpiryDays, setInviteExpiryDays] = useState(7);
  const [generatedInviteResult, setGeneratedInviteResult] = useState<{ code: string; url: string } | null>(null);

  // Join vault tab in invite modal
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinNameInput, setJoinNameInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Password Change Modal State
  const [passwordModalMember, setPasswordModalMember] = useState<FamilyMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Standalone Sub-Modals
  const [isPasswordGenOpen, setIsPasswordGenOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = inviteEmail.trim() || `kin.${Date.now().toString(36)}@myorb.live`;
    const code = inviteMember(emailToUse, inviteRole, {
      name: inviteName.trim(),
      expiresInDays: inviteExpiryDays,
    });

    const shareUrl = getVaultJoinUrl(code);
    setGeneratedInviteResult({ code, url: shareUrl });
    vaultAudio.playWhoosh();
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedItemId(id);
    vaultAudio.playWhoosh();
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    const cleanCode = extractAndNormalizeInviteCode(joinCodeInput);
    if (!cleanCode) {
      setJoinError('Please provide an invitation code.');
      return;
    }
    if (!joinNameInput.trim()) {
      setJoinError('Please provide your name.');
      return;
    }

    const success = await acceptInvitation(cleanCode, joinNameInput.trim());
    if (success) {
      setJoinSuccess(true);
      vaultAudio.playWhoosh();
      setTimeout(() => {
        setJoinSuccess(false);
        setIsInviteOpen(false);
        setJoinCodeInput('');
        setJoinNameInput('');
      }, 1400);
    } else {
      setJoinError('Invalid invitation code. Please verify and try again.');
    }
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
      vaultAudio.playWhoosh();
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
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4 shadow-xl bg-white dark:glass-panel text-slate-900 dark:text-white">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-100 dark:bg-vault-gold/15 border border-amber-300 dark:border-vault-gold/30 text-amber-900 dark:text-vault-gold">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-white tracking-wide">
              Family Governance & Kin Security
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-sans">
              Zero-knowledge client-side encryption. Manage kin roles, invite members, generate passphrases & customize profiles.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          {/* Standalone Password Generator Trigger */}
          <button
            onClick={() => setIsPasswordGenOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-vault-gold" />
            <span>Generate Password</span>
          </button>

          {/* Profile & Photo Studio Trigger */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-600/30 dark:hover:bg-purple-600/50 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Camera className="w-3.5 h-3.5 text-vault-gold" />
            <span>My Profile & Photos</span>
          </button>

          {/* Invite Family Member */}
          {isOwnerOrAdmin && (
            <button
              onClick={() => {
                setGeneratedInviteResult(null);
                setIsInviteOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Family Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Persona / Active Identity Switcher */}
      <div className="bg-white dark:bg-[#0b0e17]/80 backdrop-blur-xl p-3 sm:p-4 rounded-3xl border border-black/10 dark:border-white/10 shadow-md text-slate-900 dark:text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <UserCheck className="w-4 h-4 text-vault-gold" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Active Kin Persona:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white border border-black/10 dark:border-white/15">
              {currentMember.displayName} ({currentMember.role.toUpperCase()})
            </span>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="text-[11px] text-vault-gold hover:underline flex items-center gap-1 ml-1 cursor-pointer font-medium"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Switch Persona:</span>
            {allMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  switchActiveMember(member.id);
                  vaultAudio.playWhoosh();
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  currentMember.id === member.id
                    ? 'bg-vault-gold text-black font-bold shadow'
                    : 'bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
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
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-vault-gold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Enrolled Family Circle ({allMembers.length})</span>
            <span className="text-xs text-slate-500 font-normal">
              (Each kin has isolated E2EE keys & customizable passwords)
            </span>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="text-xs text-vault-gold hover:underline normal-case font-medium flex items-center gap-1 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Customize My Avatar</span>
          </button>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allMembers.map((member) => {
            const isSelf = member.id === currentMember.id;
            return (
              <div
                key={member.id}
                className={`glass-panel p-3.5 sm:p-4 rounded-3xl border transition-all bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm ${
                  isSelf ? 'border-vault-gold/40 shadow-glow' : 'border-black/10 dark:border-white/5'
                } flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4`}
              >
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div className="relative flex-shrink-0 cursor-pointer" onClick={() => {
                    switchActiveMember(member.id);
                    setIsProfileModalOpen(true);
                  }}>
                    <img
                      src={member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'}
                      alt={member.displayName}
                      className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-cover border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-slate-900 hover:border-vault-gold transition-all"
                    />
                    {member.role === 'owner' && (
                      <div className="absolute -top-1 -right-1 p-1 bg-amber-400 rounded-full text-slate-950 shadow-md">
                        <Crown className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.displayName}</h4>
                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40">
                          You
                        </span>
                      )}
                      {member.status === 'suspended' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-500 border border-rose-500/30">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
                    <div className="flex items-center gap-2.5 sm:gap-3 mt-1 text-[11px] text-slate-500 font-sans">
                      <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                      {member.passwordLastChanged && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          <span>Passphrase Active</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Member Access Tools & Password Change Button */}
                <div className="flex items-center flex-wrap gap-2 justify-between sm:justify-end w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
                  {/* Edit Profile & Photo */}
                  <button
                    onClick={() => {
                      switchActiveMember(member.id);
                      setIsProfileModalOpen(true);
                    }}
                    title="Edit Profile, Photo & Bio"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] border border-slate-300 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-vault-gold" />
                    <span>Profile</span>
                  </button>

                  {/* Change Password Button */}
                  <button
                    onClick={() => handleOpenPasswordModal(member)}
                    title="Change & Update Security Password"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-300 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition-all shadow cursor-pointer"
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
                      className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
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

      {/* Pending Invitations Section with 1-Click Code Sharing */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-vault-gold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-vault-gold" />
              <span>Pending Vault Invitations ({invitations.length})</span>
            </div>
            <span className="text-xs text-slate-500 normal-case font-normal font-sans">
              Codes expire automatically in 7 days
            </span>
          </h3>

          <div className="space-y-2">
            {invitations.map((inv) => {
              const code = inv.code || 'MYORB-INV-7X9K2M';
              const shareUrl = getVaultJoinUrl(code);
              return (
                <div
                  key={inv.id}
                  className="glass-panel p-3.5 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-vault-gold/15 text-vault-gold border border-vault-gold/30">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">{inv.email}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-vault-gold/40 text-vault-gold font-bold">
                          {code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-sans">
                        Role: {inv.role.toUpperCase()} • Issued by {inv.invitedByName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Copy Code */}
                    <button
                      onClick={() => handleCopyText(code, `code_${inv.id}`)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer border border-white/10"
                      title="Copy 6-digit Invite Code"
                    >
                      {copiedItemId === `code_${inv.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Code</span>
                        </>
                      )}
                    </button>

                    {/* Copy URL */}
                    <button
                      onClick={() => handleCopyText(shareUrl, `url_${inv.id}`)}
                      className="px-2.5 py-1.5 rounded-xl bg-vault-gold/15 hover:bg-vault-gold/25 text-xs text-vault-gold flex items-center gap-1 transition-all cursor-pointer border border-vault-gold/30"
                      title="Copy Shareable Join URL"
                    >
                      {copiedItemId === `url_${inv.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied URL</span>
                        </>
                      ) : (
                        <>
                          <Link className="w-3.5 h-3.5" />
                          <span>Invite Link</span>
                        </>
                      )}
                    </button>

                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => cancelInvitation(inv.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECURE PASSWORD / PASSPHRASE CHANGE MODAL */}
      {passwordModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0b0e17] border border-white/15 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => setPasswordModalMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-vault-gold/15 border border-vault-gold/30 text-vault-gold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-serif">
                  Change Kin Password
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Configuring credentials for <span className="text-white font-semibold">{passwordModalMember.displayName}</span>
                </p>
              </div>
            </div>

            {passwordSuccessMessage ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-glow">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-emerald-300 font-medium">{passwordSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPasswordChange} className="space-y-4 font-sans">
                {passwordError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300">
                    {passwordError}
                  </div>
                )}

                {/* Generator Trigger inside Password Form */}
                <div className="flex items-center justify-between pb-1">
                  <label className="text-xs text-slate-300 font-medium">New Password / Passphrase</label>
                  <button
                    type="button"
                    onClick={() => setIsPasswordGenOpen(true)}
                    className="text-[11px] text-vault-gold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter at least 8 characters..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input w-full p-2.5 rounded-xl text-xs font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                    <span>Client-Side Cryptographic Security</span>
                  </div>
                  <p>
                    Passphrases are salted and transformed into AES-256 wrapping keys locally. No plaintexts are exposed.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPasswordModalMember(null)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all cursor-pointer"
                  >
                    Update Password & Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RICH INVITE KIN & JOIN VAULT STUDIO */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0b0e17] border border-white/15 w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl relative">
            <button
              onClick={() => setIsInviteOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Tabs: Create Invite / Redeem Join Code */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setInviteTab('create')}
                className={`py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  inviteTab === 'create'
                    ? 'bg-vault-gold text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Generate Invite Link
              </button>
              <button
                type="button"
                onClick={() => setInviteTab('join')}
                className={`py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  inviteTab === 'join'
                    ? 'bg-vault-gold text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Join via Code
              </button>
            </div>

            {inviteTab === 'create' ? (
              <div>
                <h3 className="text-lg font-bold text-white mb-1 font-serif">
                  Invite Family & Kin to Vault
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-sans">
                  Generates an authorized cryptographic code and shareable link for trusted family members.
                </p>

                {generatedInviteResult ? (
                  <div className="space-y-4 font-sans">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                        <Check className="w-4 h-4" />
                        <span>Invitation Generated Successfully!</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Share this 6-digit code or complete link with your kin to grant vault membership.
                      </div>

                      <div className="pt-2 flex items-center justify-between bg-black/60 p-2.5 rounded-xl border border-vault-gold/40">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">INVITATION CODE</span>
                          <span className="text-sm font-mono font-bold text-vault-gold">
                            {generatedInviteResult.code}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(generatedInviteResult.code, 'result_code')}
                          className="px-3 py-1.5 rounded-xl bg-vault-gold text-black text-xs font-bold hover:bg-amber-400 transition-all flex items-center gap-1 cursor-pointer shadow"
                        >
                          {copiedItemId === 'result_code' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-black" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/10 text-xs">
                        <span className="text-[11px] text-slate-400 truncate max-w-[260px]">
                          {generatedInviteResult.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(generatedInviteResult.url, 'result_url')}
                          className="text-vault-gold hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedItemId === 'result_url' ? 'Copied Link' : 'Copy Link'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setGeneratedInviteResult(null)}
                        className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
                      >
                        Create Another
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInviteOpen(false)}
                        className="px-5 py-2 rounded-2xl bg-vault-gold text-black text-xs font-bold hover:bg-amber-400 transition-all shadow"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendInvite} className="space-y-3.5 font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-300 block mb-1">Recipient Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Sara Wong"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          className="glass-input w-full p-2.5 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 block mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="family.member@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="glass-input w-full p-2.5 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-300 block mb-1">Vault Role & Privileges</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as FamilyRole)}
                          className="glass-input w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-white/15 cursor-pointer text-vault-gold font-mono"
                        >
                          <option value="admin">Admin (Manage photos, albums & kin)</option>
                          <option value="member">Member (Upload & create memories)</option>
                          <option value="viewer">Viewer (Read-only viewing)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">Code Expiration</label>
                        <select
                          value={inviteExpiryDays}
                          onChange={(e) => setInviteExpiryDays(Number(e.target.value))}
                          className="glass-input w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-white/15 cursor-pointer"
                        >
                          <option value={1}>24 Hours (High Security)</option>
                          <option value={7}>7 Days (Standard)</option>
                          <option value={30}>30 Days (Extended)</option>
                        </select>
                      </div>
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
                        className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all cursor-pointer"
                      >
                        Generate Invite Code & Link
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* Join Vault Tab */
              <form onSubmit={handleJoinSubmit} className="space-y-3.5 font-sans">
                <h3 className="text-lg font-bold text-white mb-1 font-serif">
                  Join Family Vault
                </h3>
                <p className="text-xs text-slate-400 mb-3 font-sans">
                  Enter an invitation code issued by your vault owner to enroll your identity.
                </p>

                {joinError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300">
                    {joinError}
                  </div>
                )}

                {joinSuccess && (
                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Welcome! You are now enrolled into the family vault.</span>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Invitation Code</label>
                  <input
                    type="text"
                    required
                    placeholder="MYORB-INV-XXXXXX or paste invite link"
                    value={joinCodeInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('code=') || val.includes('http') || val.includes('_') || val.includes('/')) {
                        setJoinCodeInput(extractAndNormalizeInviteCode(val));
                      } else {
                        setJoinCodeInput(val.toUpperCase());
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted) {
                        e.preventDefault();
                        setJoinCodeInput(extractAndNormalizeInviteCode(pasted));
                      }
                    }}
                    className="glass-input w-full p-2.5 rounded-xl text-xs font-mono tracking-wider text-vault-gold uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sara Wong"
                    value={joinNameInput}
                    onChange={(e) => setJoinNameInput(e.target.value)}
                    className="glass-input w-full p-2.5 rounded-xl text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all cursor-pointer"
                  >
                    Enroll in Vault
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Standalone Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isPasswordGenOpen}
        onClose={() => setIsPasswordGenOpen(false)}
        onApplyPassword={(pwd: string) => {
          setNewPassword(pwd);
          setConfirmPassword(pwd);
          setIsPasswordGenOpen(false);
          vaultAudio.playWhoosh();
        }}
      />

      {/* Full User Profile Modal with Custom Photo Upload & 12 Artistic Avatars */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenPasswordModal={() => {
          setIsProfileModalOpen(false);
          handleOpenPasswordModal(currentMember);
        }}
      />
    </div>
  );
}
