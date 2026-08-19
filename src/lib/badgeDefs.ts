// 배지 정의 테이블 — SPEC 9종 배지 그대로.

import type { BadgeDef } from '@/lib/types';

export const BADGE_DEFS: readonly BadgeDef[] = [
  { id: 'first_step', name: '첫 걸음', description: '첫 무지출을 기록했어요', kind: 'total', threshold: 1 },
  { id: 'streak_3', name: '삼일의 벽', description: '3일 연속 무지출을 이어갔어요', kind: 'streak', threshold: 3 },
  { id: 'streak_7', name: '일주일 완주', description: '7일 연속 무지출을 이어갔어요', kind: 'streak', threshold: 7 },
  { id: 'streak_14', name: '2주 지킴이', description: '14일 연속 무지출을 이어갔어요', kind: 'streak', threshold: 14 },
  { id: 'streak_30', name: '한 달 절약왕', description: '30일 연속 무지출을 이어갔어요', kind: 'streak', threshold: 30 },
  { id: 'streak_60', name: '두 달 철벽', description: '60일 연속 무지출을 이어갔어요', kind: 'streak', threshold: 60 },
  { id: 'streak_100', name: '백일의 기적', description: '100일 연속 무지출을 이어갔어요', kind: 'streak', threshold: 100 },
  { id: 'total_50', name: '누적 50일', description: '누적 50일 무지출을 달성했어요', kind: 'total', threshold: 50 },
  { id: 'comeback', name: '다시 시작', description: '복구권으로 연속 기록을 지켰어요', kind: 'event', threshold: 0 },
];

export function getBadgeDef(id: string): BadgeDef | undefined {
  return BADGE_DEFS.find((badge) => badge.id === id);
}
