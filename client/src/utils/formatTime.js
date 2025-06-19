export const formatTime = (ms) => {
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec < 10 ? '0' + sec : sec}`;
};
