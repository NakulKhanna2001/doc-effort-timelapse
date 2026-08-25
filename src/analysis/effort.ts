import type { Metrics } from './metrics';

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Transparent, tunable heuristic:
 *  - low paste ratio raises the score
 *  - churn (deletions relative to typed chars) signals genuine drafting
 *  - some active time is required for a high score
 */
export function effortScore(m: Metrics): number {
  const pastePenalty = m.pasteRatio * 60;
  const churn = m.typedChars === 0 ? 0 : Math.min(m.deletions / m.typedChars, 1);
  const churnBonus = churn * 20;
  const activityBonus = Math.min(m.activeTimeMs / 60000, 1) * 20;
  return clamp(80 - pastePenalty + churnBonus + activityBonus);
}
