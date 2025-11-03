function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

export function formatNow() {
  const now = new Date();
  const date = `${pad(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `${date} ${time}`;
}
