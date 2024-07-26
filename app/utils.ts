/**
 * Performs a global search for all non-overlapping matches of a pattern in a string.
 * @param pattern - The regular expression pattern to search for.
 * @param str - The string to search within.
 * @returns An array of all matched substrings.
 */
export function findAll(pattern: RegExp, str: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  // Ensure the RegExp is global
  const globalPattern = new RegExp(
    pattern,
    pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"
  );

  while ((match = globalPattern.exec(str)) !== null) {
    matches.push(match[1] || match[0]);
  }

  return matches;
}
