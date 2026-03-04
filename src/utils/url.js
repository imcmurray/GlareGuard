/**
 * Extract a YouTube video ID from various URL formats or a bare ID.
 * Returns the 11-character video ID string, or null if invalid.
 */
export function extractVideoId(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare video ID: exactly 11 chars of [A-Za-z0-9_-]
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace('www.', '');

    // https://youtube.com/watch?v=VIDEO_ID
    if ((hostname === 'youtube.com' || hostname === 'm.youtube.com') && url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    // https://youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const id = url.pathname.slice(1);
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    // https://youtube.com/embed/VIDEO_ID or /shorts/VIDEO_ID
    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const match = url.pathname.match(/^\/(embed|shorts)\/([A-Za-z0-9_-]{11})/);
      return match ? match[2] : null;
    }
  } catch {
    // Not a valid URL — already checked bare ID above
  }

  return null;
}
