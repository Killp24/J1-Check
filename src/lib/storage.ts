export const FIXTURE_KEY = "j1-fix";
export const BET_KEY = "j1-bets";

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadArray<T>(key: string): T[] {
  const value = loadJson<unknown>(key, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode and a full disk both fail closed. The page still works for the session.
  }
}

export function newId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}
