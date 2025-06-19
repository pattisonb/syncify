import axios from 'axios';

export const getCurrentPlayback = (accessToken) => {
  return axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

export const getPlaybackQueue = (accessToken) => {
  return axios.get('https://api.spotify.com/v1/me/player/queue', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

export const getSpotifyUserProfile = (accessToken) => {
  return fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then(res => res.json());
};

export const setUserQueueFromSession = async (queue, accessToken) => {
  if (!queue?.length) return;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  try {
    for (let i = 0; i < queue.length; i++) {
      await axios.post(
        'https://api.spotify.com/v1/me/player/queue',
        null,
        {
          headers,
          params: {
            uri: queue[i].uri
          }
        }
      );

      // Add slight delay to ensure proper order
      await delay(500); // Adjust to 300–500ms if needed
    }
  } catch (err) {
    console.error('Failed to sync queue:', err.response?.data || err);
  }
};

export const syncPlaybackToTrack = async (track, accessToken) => {
  if (!track?.uri || !track?.startedAt) return;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const now = Date.now();
  const progressMs = (now - track.startedAt) + 100; // Add 1s to account for request latency

  try {
    await axios.put(
      'https://api.spotify.com/v1/me/player/play',
      {
        uris: [track.uri],
        position_ms: progressMs
      },
      { headers }
    );
  } catch (err) {
    console.error('Failed to sync playback:', err.response?.data || err);
  }
};
