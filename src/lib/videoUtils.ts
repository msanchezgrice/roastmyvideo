/**
 * Extracts a canonical identifier from a video URL.
 * Currently supports YouTube standard, short, and embed URLs.
 * 
 * @param videoUrl The URL of the video.
 * @returns A string identifier like "youtube_<VIDEO_ID>" or null if unsupported.
 */
export function getVideoIdentifier(videoUrl: string): string | null {
  if (!videoUrl || typeof videoUrl !== 'string') {
    return null;
  }

  try {
    const url = new URL(videoUrl.trim());

    // YouTube regular and mobile links (e.g., youtube.com/watch?v=VIDEO_ID, m.youtube.com/watch?v=VIDEO_ID)
    if ((url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com' || url.hostname === 'm.youtube.com') && 
        url.pathname === '/watch' && 
        url.searchParams.has('v')) {
      const videoId = url.searchParams.get('v');
      if (videoId) return `youtube_${videoId}`;
    }

    // YouTube short links (e.g., youtu.be/VIDEO_ID)
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.substring(1); // Remove leading '/'
      if (videoId) return `youtube_${videoId}`;
    }

    // YouTube shorts links (e.g., youtube.com/shorts/VIDEO_ID)
    if ((url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') && 
        url.pathname.startsWith('/shorts/')) {
      const parts = url.pathname.split('/');
      const videoId = parts[parts.length - 1];
      if (videoId) return `youtube_short_${videoId}`; // Differentiate shorts if needed, or use same prefix
    }
    
    // YouTube embed links (e.g., youtube.com/embed/VIDEO_ID)
    if ((url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') && 
        url.pathname.startsWith('/embed/')) {
      const parts = url.pathname.split('/');
      const videoId = parts[parts.length - 1];
      if (videoId) return `youtube_${videoId}`;
    }

    // Add parsers for other platforms here if needed (e.g., Vimeo, TikTok)
    // e.g., Vimeo: vimeo.com/VIDEO_ID
    // if (url.hostname === 'vimeo.com') { ... }

    console.warn(`[videoUtils] Unsupported URL format for generating identifier: ${videoUrl}`);
    return null; // Fallback for unsupported URLs

  } catch (e) {
    console.error(`[videoUtils] Error parsing video URL '${videoUrl}' for identifier:`, e);
    return null;
  }
}

// Example Test Cases (can be run with tsx or similar):
/*
if (require.main === module) {
  console.log(getVideoIdentifier('https://www.youtube.com/watch?v=dQw4w9WgXcQ')); // youtube_dQw4w9WgXcQ
  console.log(getVideoIdentifier('https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=blah')); // youtube_dQw4w9WgXcQ
  console.log(getVideoIdentifier('https://youtu.be/dQw4w9WgXcQ')); // youtube_dQw4w9WgXcQ
  console.log(getVideoIdentifier('https://www.youtube.com/shorts/abcdef12345')); // youtube_short_abcdef12345
  console.log(getVideoIdentifier('https://www.youtube.com/embed/dQw4w9WgXcQ')); // youtube_dQw4w9WgXcQ
  console.log(getVideoIdentifier('https://example.com/video.mp4')); // null
  console.log(getVideoIdentifier('')); // null
  console.log(getVideoIdentifier('notaurl')); // null
}
*/ 