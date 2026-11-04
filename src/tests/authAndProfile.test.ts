import { describe, it, expect, beforeEach } from 'vitest';
import { useVaultStore } from '../stores/useVaultStore';
import {
  generatePassword,
  generatePassphrase,
  generatePin,
  evaluatePasswordStrength,
} from '../utils/passwordGenerator';
import { extractAndNormalizeInviteCode, getVaultJoinUrl } from '../utils/inviteUtils';

describe('Password Generator & Entropy Evaluator', () => {
  it('generates a password of the specified length and character sets', () => {
    const pwd = generatePassword({
      length: 20,
      useUpper: true,
      useLower: true,
      useNumbers: true,
      useSymbols: true,
    });

    expect(pwd).toHaveLength(20);
    expect(/[A-Z]/.test(pwd)).toBe(true);
    expect(/[a-z]/.test(pwd)).toBe(true);
    expect(/[0-9]/.test(pwd)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(pwd)).toBe(true);
  });

  it('generates a Diceware-style passphrase with custom separators', () => {
    const passphrase = generatePassphrase(4, '-');

    const parts = passphrase.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(4);
    expect(/[0-9]/.test(passphrase)).toBe(true);
  });

  it('generates numeric PINs with required length', () => {
    const pin6 = generatePin(6);
    expect(pin6).toHaveLength(6);
    expect(/^\d{6}$/.test(pin6)).toBe(true);

    const pin8 = generatePin(8);
    expect(pin8).toHaveLength(8);
    expect(/^\d{8}$/.test(pin8)).toBe(true);
  });

  it('correctly assesses password entropy and crack time', () => {
    const weak = evaluatePasswordStrength('12345');
    expect(weak.score).toBeLessThanOrEqual(1);

    const strong = evaluatePasswordStrength('Cosmic-Velvet-Orion-Echo-99!');
    expect(strong.score).toBeGreaterThanOrEqual(4);
    expect(strong.entropyBits).toBeGreaterThan(60);
  });
});

describe('Vault Security & Governance (Store Operations)', () => {
  beforeEach(() => {
    // Reset to default
    const store = useVaultStore.getState();
    store.switchActiveMember('mem_curator');
  });

  it('generates an invitation code and stores the invitation', () => {
    const store = useVaultStore.getState();
    const code = store.inviteMember('alex.morgan@myorb.live', 'admin', {
      name: 'Alex Morgan',
      expiresInDays: 7,
    });

    expect(code).toMatch(/^MYORB-INV-[A-Z0-9]{6}$/);

    const updated = useVaultStore.getState();
    const found = updated.invitations.find((i) => i.code === code);
    expect(found).toBeDefined();
    expect(found?.email).toBe('alex.morgan@myorb.live');
    expect(found?.role).toBe('admin');
  });

  it('accepts an invitation and enrolls a new family member', async () => {
    const store = useVaultStore.getState();
    const code = store.inviteMember('elena.rostova@myorb.live', 'member');

    const ok = await store.acceptInvitation(code, 'Elena Rostova', 'https://example.com/avatar.jpg');
    expect(ok).toBe(true);

    const updated = useVaultStore.getState();
    expect(updated.currentMember.displayName).toBe('Elena Rostova');
    expect(updated.currentMember.email).toBe('elena.rostova@myorb.live');
    expect(updated.currentMember.avatarUrl).toBe('https://example.com/avatar.jpg');
  });

  it('authenticates with credentials and switches active profile', async () => {
    const store = useVaultStore.getState();
    const success = await store.loginWithCredentials('marcus.chen@myorb.live', 'Password123!');
    expect(success).toBe(true);

    const updated = useVaultStore.getState();
    expect(updated.currentMember.displayName).toBe('Marcus Chen');
    expect(updated.currentMember.role).toBe('admin');
  });

  it('updates member profile including bio, location, and avatar photo', () => {
    const store = useVaultStore.getState();
    store.updateMemberProfile('mem_curator', {
      displayName: 'Elena Vanderbilt-Curator',
      avatarUrl: 'https://images.unsplash.com/custom-photo.jpg',
      bio: 'Preserving our family history across generations.',
      location: 'Venice, Italy',
      phone: '+39 041 520 1234',
    });

    const updated = useVaultStore.getState();
    const member = updated.allMembers.find((m) => m.id === 'mem_curator');
    expect(member?.displayName).toBe('Elena Vanderbilt-Curator');
    expect(member?.avatarUrl).toBe('https://images.unsplash.com/custom-photo.jpg');
    expect(member?.location).toBe('Venice, Italy');
    expect(member?.bio).toBe('Preserving our family history across generations.');
  });

  it('normalizes invitation codes across URLs, spaces, underscores, and case variants', () => {
    expect(extractAndNormalizeInviteCode('https://myorb.live/join?code=MYORB_INV_G9EZRC')).toBe(
      'MYORB-INV-G9EZRC'
    );
    expect(extractAndNormalizeInviteCode('https://myorb.live/join?code=MYORB%20INV%20G9EZRC')).toBe(
      'MYORB-INV-G9EZRC'
    );
    expect(extractAndNormalizeInviteCode('MYORB INV G9EZRC')).toBe(
      'MYORB-INV-G9EZRC'
    );
    expect(extractAndNormalizeInviteCode('http://localhost:3000/join?code=MYORB-INV-7X9K2M')).toBe(
      'MYORB-INV-7X9K2M'
    );
    expect(extractAndNormalizeInviteCode('myorb_inv_g9ezrc')).toBe('MYORB-INV-G9EZRC');
    expect(extractAndNormalizeInviteCode('MYORB_INV_G9EZRC')).toBe('MYORB-INV-G9EZRC');
    expect(extractAndNormalizeInviteCode('?code=MYORB_INV_G9EZRC')).toBe('MYORB-INV-G9EZRC');
    expect(extractAndNormalizeInviteCode('/join/MYORB-INV-G9EZRC')).toBe('MYORB-INV-G9EZRC');
  });

  it('generates dynamic vault join URLs using active origin', () => {
    const url = getVaultJoinUrl('MYORB_INV_G9EZRC');
    expect(url).toContain('?code=MYORB-INV-G9EZRC');
  });

  it('accepts invitation when user passes full URL or code with underscores', async () => {
    const store = useVaultStore.getState();
    const rawCode = store.inviteMember('clara.kin@myorb.live', 'member');

    // Simulate user receiving a link with underscores or full url
    const underscoreUrl = `https://myorb.live/join?code=${rawCode.replace(/-/g, '_')}`;

    const ok = await store.acceptInvitation(underscoreUrl, 'Clara Sorensen Kin');
    expect(ok).toBe(true);

    const updated = useVaultStore.getState();
    expect(updated.currentMember.displayName).toBe('Clara Sorensen Kin');
    expect(updated.isVaultUnlocked).toBe(true);
  });
});
