import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getPlaybackQueue } from '../api/spotify';
import { generateSessionCode } from '../utils/session';
import { setUserQueueFromSession, syncPlaybackToTrack } from '../api/spotify';


const SessionControls = ({ accessToken, spotifyUser, track, elapsed, sessionCode, setSessionCode }) => {
  const [hostId, setHostId] = useState(null);
  const [hostName, setHostName] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  

  const lastTrackId = useRef(null);

useEffect(() => {
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
        duration: t.duration_ms,
        image: t.album.images && t.album.images[0] ? t.album.images[0].url : undefined
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
    const newSessionCode = generateSessionCode();

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
        duration: track.duration_ms,
        image: track.album.images && track.album.images[0] ? track.album.images[0].url : undefined
      })) || [];

      await setDoc(doc(db, 'sessions', newSessionCode), {
        hostId: spotifyUser?.id,
        hostName: spotifyUser?.name,
        createdAt: serverTimestamp(),
        service: 'spotify',
        currentTrack,
        queue
      });
      localStorage.setItem('session_code', newSessionCode);
      localStorage.setItem('host', spotifyUser?.name);
      localStorage.setItem('host_id',  spotifyUser?.id);
      setSessionCode(newSessionCode);
      setHostId(spotifyUser?.id);
      setHostName(spotifyUser?.name)
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleLeaveSession = () => {
    localStorage.removeItem('session_code');
    setSessionCode(null);
  };

  const handleEndSession = async () => {
    try {
      await deleteDoc(doc(db, 'sessions', sessionCode));
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

  const handleInvite = () => {
    if (!sessionCode) return;
    const url = `${window.location.origin}/?invite=${sessionCode}`;
    navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 1800);
  };

  return (
    <div className="syncify-card">
      {!sessionCode ? (
        <>
          <button onClick={handleStartSession} className="syncify-btn">
            Start Session
          </button>
                {!joining ? (
        <button onClick={() => setJoining(true)} className="syncify-btn">Join Session</button>
        ) : (
        <div className="syncify-controls">
            <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value)}
            placeholder="Enter session code"
            style={{ borderRadius: 12, padding: 10, fontSize: '1rem', border: 'none', margin: '8px 0', width: '100%' }}
            />
            <button onClick={handleJoinSession} className="syncify-control-btn">Confirm</button>
            <button onClick={() => setJoining(false)} className="syncify-control-btn">
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
          {hostId === spotifyUser?.id ? (
            <div>
            <button onClick={handleEndSession} className="syncify-btn syncify-btn--danger">
              End Session
            </button>
            <div className="syncify-tooltip-parent">
                    <button className="syncify-control-btn syncify-control-btn--icon" title="Copy invite link" onClick={handleInvite}>Invite</button>
                    {inviteCopied && (
                      <div className="syncify-tooltip" style={{ opacity: 1, visibility: 'visible', pointerEvents: 'auto' }}>Invite link copied!</div>
                    )}
                  </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div className="syncify-controls-row" style={{ justifyContent: 'center', width: '100%' }}>
                <div className="syncify-tooltip-parent">
                  <button className="syncify-control-btn syncify-control-btn--primary" title="Jump to the host's current song" onClick={() => handleSyncPlayback(false)}>Instant Sync</button>
                  <div className="syncify-tooltip">Jump to the host's current song</div>
                </div>
                <div className="syncify-tooltip-parent">
                  <button className="syncify-control-btn syncify-control-btn--secondary" title="Match host's song and queue" onClick={handleSyncPlayback}>Full Sync</button>
                  <div className="syncify-tooltip">Match host's song and queue</div>
                </div>
                {sessionCode && (
                  <div className="syncify-tooltip-parent">
                    <button className="syncify-control-btn syncify-control-btn--icon" title="Copy invite link" onClick={handleInvite}>Invite</button>
                    {inviteCopied && (
                      <div className="syncify-tooltip" style={{ opacity: 1, visibility: 'visible', pointerEvents: 'auto' }}>Invite link copied!</div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={handleLeaveSession} className="syncify-btn syncify-btn--inline syncify-btn--danger" style={{ marginTop: 18, fontSize: '0.98rem', padding: '10px 28px' }}>
                Leave
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SessionControls;
