/** Replaces every occurrence of each secret (3+ characters) with '***'. Longest first, so overlapping secrets mask fully. */
export function maskSecrets(text: string, secrets: string[]): string {
  return secrets
    .filter((s) => s && s.length >= 3)
    .sort((a, b) => b.length - a.length)
    .reduce((t, s) => t.split(s).join('***'), text);
}
