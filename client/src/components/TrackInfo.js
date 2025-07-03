import React from 'react';
import { formatTime } from '../utils/formatTime';

const TrackInfo = ({ track, elapsed }) => {
  if (!track) return null;
  const progress = track.duration ? Math.min(elapsed / track.duration, 1) : 0;
  // Support both 'artist' (string) and 'artists' (array)
  const artist = track.artist || (Array.isArray(track.artists) ? track.artists.join(', ') : track.artists);

  return (
    <div className="syncify-card">
      <img className="syncify-track-art" src={track.image} alt="Album art" />
      <div className="syncify-track-title">{track.name}</div>
      <div style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 400, marginBottom: 8 }}>{artist}</div>
      <div className="syncify-progress-bar">
        <div className="syncify-progress" style={{ width: `${progress * 100}%` }}></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.9rem', color: '#ccc', marginTop: 4 }}>
        <span>{formatTime(elapsed)}</span>
        <span>{formatTime(track.duration)}</span>
      </div>
    </div>
  );
};

export default TrackInfo;
