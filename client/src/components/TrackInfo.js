import React from 'react';
import { formatTime } from '../utils/formatTime';

const TrackInfo = ({ track, elapsed }) => {
  console.log("resr")
  console.log(track)
  if (!track) return null;

  return (
    <div style={{ marginTop: 30 }}>
      <img src={track.image} alt="Album art" width={300} />
      <h2>{track.name}</h2>
      <h3>{track.artist}</h3>
      <p>{track.album}</p>
    </div>
  );
};

export default TrackInfo;
