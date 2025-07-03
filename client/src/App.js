import { useEffect, useState } from 'react';
import { getSpotifyUserProfile } from './api/spotify';
import { usePlayback } from './hooks/usePlayback';
import TrackInfo from './components/TrackInfo';
import SessionControls from './components/SessionControls';
import UpcomingTracks from './components/UpcomingTracks';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import './SyncifyTheme.css';
// import { loginToAppleMusic } from './hooks/useAppleMusic';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI;

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const { track, elapsed } = usePlayback(accessToken);
  const [hostId, setHostId] = useState(null);
  const [remoteTrack, setRemoteTrack] = useState(null);
  const [remoteElapsed, setRemoteElapsed] = useState(0);
  const [sessionCode, setSessionCode] = useState(null);
  const [remoteQueue, setRemoteQueue] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('access_token');
    const refreshTokenFromUrl = params.get('refresh_token');
    const storedSession = localStorage.getItem('session_code');
    const storedHostId = localStorage.getItem('host_id');
    const inviteCode = params.get('invite');
    if (storedSession) setSessionCode(storedSession);
    if (storedHostId) setHostId(storedHostId);

    if (tokenFromUrl) {
      localStorage.setItem('access_token', tokenFromUrl);
      if (refreshTokenFromUrl) {
        localStorage.setItem('refresh_token', refreshTokenFromUrl);
      }

      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
      setAccessToken(tokenFromUrl);
      if (inviteCode) {
        setSessionCode(inviteCode);
        localStorage.setItem('session_code', inviteCode);
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }
    } else {
      const stored = localStorage.getItem('access_token');
      const storedRefresh = localStorage.getItem('refresh_token');

      if (stored) {
        setAccessToken(stored);
        if (inviteCode) {
          setSessionCode(inviteCode);
          localStorage.setItem('session_code', inviteCode);
          const url = new URL(window.location.href);
          url.searchParams.delete('invite');
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }
      } else if (storedRefresh) {
        fetch(`${API_BASE_URL}/refresh?refresh_token=${storedRefresh}`)
          .then(res => res.json())
          .then(data => {
            if (data.access_token) {
              localStorage.setItem('access_token', data.access_token);
              setAccessToken(data.access_token);
              if (inviteCode) {
                setSessionCode(inviteCode);
                localStorage.setItem('session_code', inviteCode);
                const url = new URL(window.location.href);
                url.searchParams.delete('invite');
                window.history.replaceState({}, document.title, url.pathname + url.search);
              }
            }
          })
          .catch(err => {
            console.error('Failed to refresh token:', err);
            handleLogout();
          });
      }
    }
  }, []);

  useEffect(() => {
    if (!accessToken || !sessionCode || hostId === spotifyUser?.id) return;

    const fetchOnce = async () => {
      try {
        const sessionRef = doc(db, 'sessions', sessionCode);
        const sessionSnap = await getDoc(sessionRef);
        if (!sessionSnap.exists()) return;

        const currentTrack = sessionSnap.data()?.currentTrack;
        const queue = sessionSnap.data()?.queue || [];
        if (!currentTrack) return;

        setRemoteTrack(currentTrack);
        setRemoteQueue(queue);

        const elapsed = currentTrack.isPlaying
          ? Date.now() - currentTrack.startedAt
          : 0;

        setRemoteElapsed(elapsed);
      } catch (err) {
        console.error('Failed to fetch session playback:', err);
      }
    };

    fetchOnce();
    const interval = setInterval(fetchOnce, 5000);
    return () => clearInterval(interval);
  }, [accessToken, sessionCode, hostId, spotifyUser?.id]);

  useEffect(() => {
    if (!accessToken) return;
    getSpotifyUserProfile(accessToken)
      .then(data => {
        if (data?.id) {
          setSpotifyUser({
            id: data.id,
            name: data.display_name || 'Unknown',
          });
        }
      })
      .catch(err => console.error('Failed to fetch user profile:', err));
  }, [accessToken]);

  return (
    <div className="syncify-container">
      <div style={{ textAlign: 'center' }}>
        <div className="syncify-header">Syncify 🎵</div>
        {!accessToken ? (
          <a href={`${API_BASE_URL}/login?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`}>
            <button className="syncify-btn">Login with Spotify</button>
          </a>
        ) : (
          <>
            <button className="syncify-btn syncify-btn--inline syncify-btn--danger" onClick={handleLogout}>Logout</button>
            {spotifyUser?.name && (
              <div style={{ fontSize: '0.95rem', color: '#bbb', marginBottom: 16 }}>
                Logged in as <span style={{ color: '#fff', fontWeight: 600 }}>{spotifyUser.name}</span>
              </div>
            )}
          </>
        )}
      </div>
      {accessToken && (
        <div className="syncify-main-layout">
          <SessionControls
            accessToken={accessToken}
            spotifyUser={spotifyUser}
            track={track}
            elapsed={elapsed}
            sessionCode={sessionCode}
            setSessionCode={setSessionCode}
          />
          <div className="syncify-header" style={{ fontSize: '1.3rem', marginBottom: 12 }}>Current Playback</div>
          <TrackInfo
            track={hostId === spotifyUser?.id ? track : remoteTrack}
            elapsed={hostId === spotifyUser?.id ? elapsed : remoteElapsed}
          />
          <UpcomingTracks
            queue={hostId === spotifyUser?.id ? [] : remoteQueue}
            currentTrackId={(hostId === spotifyUser?.id ? track : remoteTrack)?.id}
          />
        </div>
      )}
    </div>
  );
}

export default App;
