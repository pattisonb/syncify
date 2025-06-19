// ⬇️ Create this file
export const syncApplePlayback = async (track) => {
  const music = window.MusicKit.getInstance();
  if (!track?.id) return;

  await music.setQueue({ song: track.id });
  await music.play();

  const startTimeSec = (Date.now() - track.startedAt) / 1000;
  await music.seekToTime(startTimeSec);
};
