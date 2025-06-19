import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getPlaybackQueue } from '../api/spotify';
import { generateSessionCode } from '../utils/session';
import { setUserQueueFromSession, syncPlaybackToTrack } from '../api/spotify';


const SessionControls = ({ accessToken, spotifyUser, track, elapsed }) => {
  const [sessionCode, setSessionCode] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [hostName, setHostName] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  

  const lastTrackId = useRef(null);

useEffect(() => {
  const savedCode = localStorage.getItem('session_code');   
  if (savedCode) {
    setSessionCode(savedCode);
  }
const savedHost = localStorage.getItem('host');
  if (savedHost) {
    setHostName(savedHost);
  }
  const savedHostId = localStorage.getItem('host_id');
  if (savedHostId) {
    setHostId(savedHostId);
  }
}, []);

useEffect(() => {
  const updateSessionTrack = async () => {
    if (!sessionCode || !track?.id || !accessToken || hostId !== spotifyUser?.id) return;

    if (track.id === lastTrackId.current) return; // no change

    try {
      const sessionRef = doc(db, 'sessions', sessionCode);
      const sessionSnap = await getDoc(sessionRef);
      const serverTrack = sessionSnap.data()?.currentTrack;

      if (serverTrack?.id === track.id) return;

      console.log('Updating Firestore with new track and queue:', track.name);

      const queueData = await getPlaybackQueue(accessToken);
      const queue = queueData?.data?.queue?.map(t => ({
        id: t.id,
        name: t.name,
        artists: t.artists.map(a => a.name),
        album: t.album.name,
        uri: t.uri,
        duration: t.duration_ms
      })) || [];

      await updateDoc(sessionRef, {
        currentTrack: {
          id: track.id,
          name: track.name,
          album: track.album,
          artists: track.artist,
          uri: track.uri,
          duration: track.duration,
          isPlaying: track.isPlaying,
          startedAt: Date.now() - (track.isPlaying ? elapsed : 0),
          image: track.image
        },
        queue
      });

      lastTrackId.current = track.id;
    } catch (err) {
      console.error("Failed to update track or queue in session:", err);
    }
  };

  updateSessionTrack();
}, [track?.id]);


  const handleStartSession = async () => {
    const sessionCode = generateSessionCode();

    try {
      const nowPlayingRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const nowPlaying = await nowPlayingRes.json();
        console.log(nowPlaying.item.al)
      const progress = nowPlaying?.progress_ms ?? 0;
      const currentTrack = nowPlaying?.item ? {
        id: nowPlaying.item.id,
        name: nowPlaying.item.name,
        artists: nowPlaying.item.artists.map(a => a.name),
        album: nowPlaying.item.album.name,
        uri: nowPlaying.item.uri,
        duration: nowPlaying.item.duration_ms,
        isPlaying: nowPlaying?.is_playing,
        startedAt: Date.now() - progress,
        image: nowPlaying?.item.album.images[0]
      } : null;
      console.log(nowPlaying.album)
      const queueData = await getPlaybackQueue(accessToken);
      const queue = queueData?.data?.queue?.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => a.name),
        album: track.album.name,
        uri: track.uri,
        duration: track.duration_ms
      })) || [];

      await setDoc(doc(db, 'sessions', sessionCode), {
        hostId: spotifyUser?.id,
        hostName: spotifyUser?.name,
        createdAt: serverTimestamp(),
        service: 'spotify',
        currentTrack,
        queue
      });
      localStorage.setItem('session_code', sessionCode);
      localStorage.setItem('host', spotifyUser?.name);
      localStorage.setItem('host_id',  spotifyUser?.id);
      setSessionCode(sessionCode);
      setHostId(spotifyUser?.id);
      setHostName(spotifyUser?.name)
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleLeaveSession = () => {
    setSessionCode(null);
    localStorage.removeItem('session_code');
  };

  const handleEndSession = async () => {
    try {
      await deleteDoc(doc(db, 'sessions', sessionCode));
      setSessionCode(null);
      localStorage.removeItem('session_code'); 
      setHostId(null);
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  const handleJoinSession = async () => {
  const trimmedCode = joinCodeInput.trim();
  if (!trimmedCode) return;

  try {
    const sessionRef = doc(db, 'sessions', trimmedCode);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      alert('Session not found');
      return;
    }

    localStorage.setItem('session_code', trimmedCode);
    setSessionCode(trimmedCode);

    const sessionData = sessionSnap.data();
    localStorage.setItem('host', sessionData.hostName);
    localStorage.setItem('host_id', sessionData.hostId);
    setHostName(sessionData.hostName);
    setHostId(sessionData.hostId)
    console.log(sessionData)
    setJoining(false);
  } catch (err) {
    console.error("Failed to join session:", err);
  }
};

const handleSyncPlayback = async (syncQueue = true) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionCode);
    const sessionSnap = await getDoc(sessionRef);
    const sessionData = sessionSnap.data();

    const { currentTrack, queue } = sessionData;
    if (sessionData.service === 'apple') {
  const { syncApplePlayback } = await import('../api/apple');
  await syncApplePlayback(currentTrack);
} else {
  await syncPlaybackToTrack(currentTrack, accessToken);
  if (syncQueue) {
    await setUserQueueFromSession(queue, accessToken);
  }
}

  } catch (err) {
    console.error('Failed to sync playback:', err);
  }
};

  return (
    <div style={{ marginTop: 20 }}>
      {!sessionCode ? (
        <>
          <button onClick={handleStartSession} style={{ marginRight: 10 }}>
            Start Session
          </button>
                {!joining ? (
        <button onClick={() => setJoining(true)}>Join Session</button>
        ) : (
        <div style={{ marginTop: 10 }}>
            <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value)}
            placeholder="Enter session code"
            style={{ marginRight: 10 }}
            />
            <button onClick={handleJoinSession}>Confirm</button>
            <button onClick={() => setJoining(false)} style={{ marginLeft: 5 }}>
            Cancel
            </button>
        </div>
        )}
        </>
      ) : (
        <>
          <h2>Current Session</h2>
          <h4>Session ID: {sessionCode}</h4>
          <p>Hosted by: <strong>{hostName}</strong></p>
          <button onClick={handleLeaveSession} style={{ marginRight: 10 }}>
            Leave Session
          </button>
{hostId === spotifyUser?.id ? (
  <button onClick={handleEndSession} style={{ marginRight: 10, color: 'red' }}>
    End Session
  </button>
) : (
    <div>
<button onClick={() => handleSyncPlayback(false)} style={{ marginRight: 10 }}>
  Sync Playback
</button>

    <button onClick={handleSyncPlayback} style={{ marginRight: 10 }}>
    Sync Playback and Queue
  </button>
  </div>
)}
          <button>Invite Users</button>
        </>
      )}
    </div>
  );
};

export default SessionControls;
