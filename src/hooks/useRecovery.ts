import { useCallback, useState } from 'react';
import type { RecoveryUsage, RecoveryWallet } from '@/lib/types';
import { readRecovery, writeRecovery } from '@/lib/storage';
import { todayKST } from '@/lib/date';

const MAX_TICKETS = 3;

export type EarnTicketResult =
  | { ok: true }
  | { ok: false; reason: 'MAX_TICKETS' | 'ALREADY_EARNED_TODAY' | 'STORAGE_FULL' };

export type UseTicketResult = { ok: true } | { ok: false; reason: 'NO_TICKETS' | 'STORAGE_FULL' };

export interface UseRecoveryResult {
  wallet: RecoveryWallet;
  canEarn: boolean;
  earnTicket: () => EarnTicketResult;
  useTicket: (targetDate: string) => UseTicketResult;
}

function alreadyEarnedToday(wallet: RecoveryWallet, today: string): boolean {
  return wallet.earnedTodayDate === today && wallet.earnedToday >= 1;
}

export function useRecovery(): UseRecoveryResult {
  const [wallet, setWallet] = useState<RecoveryWallet>(() => readRecovery());

  const canEarn = wallet.tickets < MAX_TICKETS && !alreadyEarnedToday(wallet, todayKST());

  const earnTicket = useCallback((): EarnTicketResult => {
    const current = readRecovery();
    if (current.tickets >= MAX_TICKETS) {
      return { ok: false, reason: 'MAX_TICKETS' };
    }
    const today = todayKST();
    if (alreadyEarnedToday(current, today)) {
      return { ok: false, reason: 'ALREADY_EARNED_TODAY' };
    }

    const updated: RecoveryWallet = {
      ...current,
      tickets: current.tickets + 1,
      earnedToday: 1,
      earnedTodayDate: today,
    };
    const written = writeRecovery(updated);
    if (!written) return { ok: false, reason: 'STORAGE_FULL' };
    setWallet(updated);
    return { ok: true };
  }, []);

  const useTicket = useCallback((targetDate: string): UseTicketResult => {
    const current = readRecovery();
    if (current.tickets <= 0) {
      return { ok: false, reason: 'NO_TICKETS' };
    }

    const usage: RecoveryUsage = { recoveredDate: targetDate, usedAt: Date.now() };
    const updated: RecoveryWallet = {
      ...current,
      tickets: current.tickets - 1,
      usages: [...current.usages, usage],
    };
    const written = writeRecovery(updated);
    if (!written) return { ok: false, reason: 'STORAGE_FULL' };
    setWallet(updated);
    return { ok: true };
  }, []);

  return { wallet, canEarn, earnTicket, useTicket };
}
