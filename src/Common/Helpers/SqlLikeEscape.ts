/**
 * Escapes `\`, `%`, and `_` so a raw search string can be safely embedded in a
 * SQL LIKE/ILIKE pattern (e.g. wrapped as `%${EscapeLikePattern(value)}%`)
 * without the user's input being interpreted as a wildcard.
 */
export const EscapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, '\\$&');
