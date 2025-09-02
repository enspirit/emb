import { DateTime } from 'luxon';

export const timeAgo = (date: Date | DateTime | null | undefined) => {
  if (!date) {
    return '';
  }

  const now = Date.now();
  const then =
    date instanceof Date ? date.getTime() : date.toJSDate().getTime();
  const diff = Math.max(0, now - then); // in ms

  let seconds = Math.floor(diff / 1000);

  const units = [
    { label: 'y', secs: 60 * 60 * 24 * 365 },
    { label: 'mo', secs: 60 * 60 * 24 * 30 },
    { label: 'w', secs: 60 * 60 * 24 * 7 },
    { label: 'd', secs: 60 * 60 * 24 },
    { label: 'h', secs: 60 * 60 },
    { label: 'm', secs: 60 },
    { label: 's', secs: 1 },
  ];

  const parts = [];
  for (const { label, secs } of units) {
    const value = Math.floor(seconds / secs);
    if (value > 0) {
      parts.push(`${value}${label}`);
      seconds -= value * secs;
    }

    if (parts.length === 2) {
      break;
    } // only 2 units max
  }

  return parts.join('');
};
