export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * 손상된 JSON, 스키마 불일치, storage 접근 불가 상황에서도 절대 throw하지 않는다.
 * 읽은 값이 fallback으로 대체될 때는 그 fallback을 재저장해 다음 번엔 정상 값이 읽히게 한다.
 */
export function readStore<T>(key: string, fallback: T, guard: (value: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === "null") {
      persistFallback(key, fallback);
      return fallback;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      persistFallback(key, fallback);
      return fallback;
    }

    if (!guard(parsed)) {
      persistFallback(key, fallback);
      return fallback;
    }

    return parsed as T;
  } catch {
    return fallback;
  }
}

function persistFallback<T>(key: string, fallback: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(fallback));
  } catch {
    // 저장 실패해도 read 자체는 fallback을 반환해야 하므로 무시한다.
  }
}

export function writeStore<T>(key: string, value: T): { ok: true } | { ok: false; reason: "STORAGE_FULL" } {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, reason: "STORAGE_FULL" };
  }
}
