import { useEffect, useState, useRef } from 'react';
import { getCurrentPlayback } from '../api/spotify';

export const usePlayback = (accessToken) => {
  const [track, setTrack] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const currentTrackId = useRef(null);

  const fetchPlayback = () => {
    if (!accessToken) return;
    getCurrentPlayback(accessToken)
      .then(res => {
        const item = res.data?.item;
        const isPlaying = res.data?.is_playing;
        const progress = res.data?.progress_ms ?? 0;
        if (item) {
          if (item.id !== currentTrackId.current) {
            currentTrackId.current = item.id;

            setTrack({
              id: item.id,
              name: item.name,
              uri: item.uri,
              artist: item.artists.map(a => a.name).join(', '),
              album: item.album.name,
              image: item.album.images[0]?.url,
              duration: item.duration_ms,
              isPlaying,
            });

            if (isPlaying) {
              setStartTime(Date.now() - progress);
            }
          }
        } else {
          setTrack(null);
          currentTrackId.current = null;
        }
      })
      .catch(console.error);
  };

  // Initial load
  useEffect(() => {
    fetchPlayback();
  }, [accessToken]);

  // Re-check every 5 seconds for track change
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      fetchPlayback();
    }, 5000);

    return () => clearInterval(interval);
  }, [accessToken]);

  const elapsed = track?.isPlaying && startTime ? Date.now() - startTime : 0;

  return { track, elapsed };
};
