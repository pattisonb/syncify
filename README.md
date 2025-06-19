# 🎵 Syncify

Real-time music session sharing using Spotify. Create a session, share a code, and sync playback across devices or friends.

---

## 🚀 Features

- Login with your Spotify account  
- Start or join a playback session  
- Sync playback and queue from host to guests  
- Firebase-powered real-time session storage  
- React frontend + Node/Express backend

---

## 🔧 Tech Stack

- React 19 (Create React App)  
- Express + Node.js  
- Firebase Firestore  
- Spotify Web API  
- Render (server) + Vercel (client)

---

## 🛠 Setup

### 1. Clone
```
git clone https://github.com/pattisonb/syncify.git
cd syncify
```

### 2. Configure Envs

#### /server/.env
```
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
REDIRECT_URI=https://your-backend.onrender.com/callback
FRONTEND_URI=https://your-frontend.vercel.app
```

#### /client/.env
```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

### 3. Start Dev

#### Backend
```
cd server
npm install
node index.js
```

#### Frontend
```
cd ../client
npm install
npm start
```

---

## 🌐 Deployment

- **Frontend** → Vercel  
- **Backend** → Render  
- Make sure your Spotify Developer Dashboard has this redirect URI:  
  ```
  https://your-backend.onrender.com/callback
  ```

---

## ✅ Status

✅ Spotify login  
✅ Playback sync  
✅ Firebase session logic  
🔜 Apple Music (tabled for now)

---

## 🙌 Credits

Built by [@pattisonb](https://github.com/pattisonb)
