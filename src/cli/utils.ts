const DATE_UNITS: Partial<Record<Intl.RelativeTimeFormatUnit, number>> = {
  day: 86_400,
  hour: 3600,
  minute: 60,
  second: 1,
};

const getSecondsDiff = (timestamp: number) => (Date.now() - timestamp) / 1000;

const getUnitAndValueDate = (
  secondsElapsed: number,
): { unit: Intl.RelativeTimeFormatUnit; value: number } => {
  for (const [unit, secondsInUnit] of Object.entries(DATE_UNITS)) {
    if (secondsElapsed >= secondsInUnit || unit === 'second') {
      const value = Math.floor(secondsElapsed / secondsInUnit) * -1;
      return { value, unit: unit as Intl.RelativeTimeFormatUnit };
    }
  }

  const value = Math.floor(secondsElapsed / DATE_UNITS.day!) * -1;
  return { value, unit: 'day' as Intl.RelativeTimeFormatUnit };
};

export const getTimeAgo = (timestamp?: number) => {
  if (!timestamp) {
    return;
  }

  const rtf = new Intl.RelativeTimeFormat();

  const secondsElapsed = getSecondsDiff(timestamp * 1000);
  const { value, unit } = getUnitAndValueDate(secondsElapsed);

  return rtf.format(value, unit);
};
