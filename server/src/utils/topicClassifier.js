export function classifyTopic({
  totalSolved = 0,
  weakCount = 0,
  revisionCount = 0
} = {}) {
  const total = Math.max(Number(totalSolved) || 0, 0);
  const weak = Math.max(Number(weakCount) || 0, 0);
  const revision = Math.max(Number(revisionCount) || 0, 0);

  if (total === 0) return "untouched";
  if (total < 5) return "practicing";

  const weakRatio = weak / total;
  const revisionRatio = revision / total;
  if (weakRatio >= 0.4 || revisionRatio >= 0.4) return "weak";
  return "strong";
}
