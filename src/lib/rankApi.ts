import type { RankEntry } from '@/lib/types';
import { writeRankCache } from '@/lib/storage';

const TIMEOUT_MS = 5000;

export type RankApiErrorCode = 'NETWORK' | 'SERVER' | 'ROOM_NOT_FOUND' | 'INVALID_PAYLOAD';

export type RankApiResult =
  | { ok: true }
  | { ok: false; code: RankApiErrorCode };

export type JoinRoomResult =
  | { ok: true; roomCode: string }
  | { ok: false; code: RankApiErrorCode };

export type FetchRankResult =
  | { ok: true; entries: RankEntry[] }
  | { ok: false; code: RankApiErrorCode };

function getBaseUrl(): string {
  return (import.meta.env.VITE_RANK_API_BASE as string | undefined)?.trim() ?? '';
}

export function isRankEnabled(): boolean {
  return getBaseUrl().length > 0;
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; code: RankApiErrorCode }> {
  const base = getBaseUrl();
  if (!base) return { ok: false, code: 'NETWORK' };

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  // Race a timeout promise instead of relying on fetch to reject on abort —
  // mocked/hung fetch implementations may not honor the abort signal.
  const timeoutPromise = new Promise<{ ok: false; code: RankApiErrorCode }>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ ok: false, code: 'NETWORK' });
    }, TIMEOUT_MS);
  });

  const fetchPromise = (async (): Promise<{ ok: true; data: T } | { ok: false; code: RankApiErrorCode }> => {
    try {
      const res = await fetch(`${base}${path}`, { ...init, signal: controller.signal });
      if (res.status === 404) return { ok: false, code: 'ROOM_NOT_FOUND' };
      if (!res.ok) return { ok: false, code: 'SERVER' };
      const data = (await res.json()) as T;
      return { ok: true, data };
    } catch {
      return { ok: false, code: 'NETWORK' };
    }
  })();

  const result = await Promise.race([fetchPromise, timeoutPromise]);
  clearTimeout(timer!);
  return result;
}

export async function syncStreak(
  deviceUserId: string,
  nickname: string,
  currentStreak: number,
  bestStreak: number,
  totalDays: number
): Promise<RankApiResult> {
  if (!isRankEnabled()) return { ok: false, code: 'NETWORK' };
  const result = await request<{ ok: true }>('/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceUserId, nickname, currentStreak, bestStreak, totalDays }),
  });
  if (!result.ok) return result;
  return { ok: true };
}

export async function joinRoom(deviceUserId: string, roomCode: string): Promise<JoinRoomResult> {
  if (!isRankEnabled()) return { ok: false, code: 'NETWORK' };
  const result = await request<{ roomCode: string }>('/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceUserId, roomCode }),
  });
  if (!result.ok) return result;
  return { ok: true, roomCode: result.data.roomCode };
}

export async function fetchRank(roomCode: string): Promise<FetchRankResult> {
  if (!isRankEnabled()) return { ok: false, code: 'NETWORK' };
  const result = await request<{ entries: RankEntry[] }>(
    `/rooms/${encodeURIComponent(roomCode)}/rank`
  );
  if (!result.ok) return result;
  writeRankCache(result.data.entries);
  return { ok: true, entries: result.data.entries };
}
