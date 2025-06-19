// ⬇️ Create this file
export const initMusicKit = (developerToken) => {
  window.MusicKit.configure({
    developerToken,
    app: {
      name: 'Syncify',
      build: '1.0'
    }
  });

  return window.MusicKit.getInstance();
};

export const loginToAppleMusic = async (developerToken) => {
  const music = initMusicKit(developerToken);
  const userToken = await music.authorize();
  localStorage.setItem('apple_user_token', userToken);
  return music;
};
