import React from 'react';

const UpcomingTracks = ({ queue, currentTrackId }) => {
  if (!queue || queue.length === 0) return null;
  // Exclude the current track and take the next 5
  const upcoming = queue.filter(t => t.id !== currentTrackId).slice(0, 5);
  if (upcoming.length === 0) return null;

  return (
    <div className="syncify-card syncify-card--left" style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 10, color: '#fff', textDecoration: 'underline' }}>
        Upcoming Songs
      </div>
      {upcoming.map((track, idx) => (
        <div key={track.id} style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 12, fontSize: '1.3em', lineHeight: 1, display: 'flex', alignItems: 'center' }}>🎵</span>
          <div>
            <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 500 }}>{track.name}</div>
            <div style={{ color: '#bbb', fontWeight: 400, fontSize: '0.97rem' }}>{Array.isArray(track.artists) ? track.artists.join(', ') : track.artists}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingTracks; 