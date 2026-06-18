export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * How long after a refresh token is rotated we still treat a replay of it as a
 * BENIGN race rather than theft. Concurrent refreshers (multiple tabs, or a page
 * reload that aborts an in-flight refresh) can legitimately present the same,
 * just-rotated token within a few seconds. Within this window we reject the
 * losing request WITHOUT revoking the whole token family, so the request that
 * won the race keeps its session. A replay long after rotation is real reuse and
 * still revokes everything.
 */
export const REFRESH_TOKEN_ROTATION_GRACE_MS = 15_000;
