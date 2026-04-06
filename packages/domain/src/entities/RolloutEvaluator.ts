/**
 * Evaluates whether a toggle should be enabled based on rollout percentage.
 *
 * Strategies:
 * - With userId: deterministic hash-based bucketing (same user always gets same result)
 * - Without userId: random per request
 *
 * Designed for extensibility — future strategies (cookie, IP, custom attribute)
 * can be added by extending the identifier parameter.
 */
export function evaluateRollout(
  percentage: number,
  toggleKey: string,
  userId?: string
): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;

  const bucket = userId
    ? hashBucket(toggleKey, userId)
    : Math.random() * 100;

  return bucket < percentage;
}

/**
 * Deterministic hash-based bucket assignment.
 * Same (toggleKey, userId) always maps to the same 0-99 bucket.
 * Uses djb2 hash — fast, good distribution, zero dependencies.
 */
function hashBucket(toggleKey: string, userId: string): number {
  const input = `${toggleKey}:${userId}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}
