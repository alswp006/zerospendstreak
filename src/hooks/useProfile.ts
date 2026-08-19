import { useCallback, useState } from 'react';
import type { Profile } from '@/lib/types';
import { ensureProfile, writeProfile } from '@/lib/storage';

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;

export type SetNicknameResult = { ok: true } | { ok: false; reason: 'INVALID_NICKNAME' | 'STORAGE_FULL' };

export interface UseProfileResult {
  profile: Profile;
  isOnboarded: boolean;
  setNickname: (nickname: string) => SetNicknameResult;
  markOnboarded: () => void;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile>(() => ensureProfile());

  const setNickname = useCallback(
    (nickname: string): SetNicknameResult => {
      const trimmed = nickname.trim();
      if (trimmed.length < NICKNAME_MIN_LENGTH || trimmed.length > NICKNAME_MAX_LENGTH) {
        return { ok: false, reason: 'INVALID_NICKNAME' };
      }

      const updated: Profile = { ...profile, nickname: trimmed };
      const written = writeProfile(updated);
      if (!written) return { ok: false, reason: 'STORAGE_FULL' };
      setProfile(updated);
      return { ok: true };
    },
    [profile]
  );

  const markOnboarded = useCallback(() => {
    const updated: Profile = { ...profile, onboardedAt: Date.now() };
    writeProfile(updated);
    setProfile(updated);
  }, [profile]);

  return {
    profile,
    isOnboarded: profile.onboardedAt !== null,
    setNickname,
    markOnboarded,
  };
}
