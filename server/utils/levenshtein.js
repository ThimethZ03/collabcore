/**
 * Compute Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Compute similarity ratio (0 to 1) between two strings
 */
function similarity(a, b) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(al, bl) / maxLen;
}

module.exports = { levenshteinDistance, similarity };
