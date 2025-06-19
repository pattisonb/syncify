import { useState, useEffect } from 'react';
import { getSpotifyUserProfile } from '../api/spotify';

export const useSpotifyUser = (accessToken) => {
  const [spotifyUser, setSpotifyUser] = useState(null);

  useEffect(() => {
    if (!accessToken) return;

    getSpotifyUserProfile(accessToken)
      .then(data => {
        if (data?.id) {
          setSpotifyUser({
            id: data.id,
            name: data.display_name || 'Unknown'
          });
        }
      })
      .catch(err => console.error('Failed to fetch Spotify user:', err));
  }, [accessToken]);

  return spotifyUser;
};
