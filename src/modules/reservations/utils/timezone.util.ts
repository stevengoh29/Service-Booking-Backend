export function getUtcDateForBusiness(
  date: string,
  time: string,
  timezone: string,
): Date {
  // date: "YYYY-MM-DD", time: "HH:MM"
  const localStr = `${date}T${time}:00`;
  const tempDate = new Date(`${localStr}Z`);
  if (isNaN(tempDate.getTime())) {
    throw new Error('Invalid date/time format');
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  let utcMillis = tempDate.getTime();
  for (let i = 0; i < 3; i++) {
    const testDate = new Date(utcMillis);
    const parts = formatter.formatToParts(testDate);
    const partVal = (type: string) =>
      parts.find((p) => p.type === type)?.value || '';

    const year = partVal('year');
    const month = partVal('month');
    const day = partVal('day');
    const hour = partVal('hour');
    const minute = partVal('minute');
    const second = partVal('second');

    const formattedLocalStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const targetLocalStr = `${date}T${time}:00`;

    const diff =
      new Date(`${formattedLocalStr}Z`).getTime() -
      new Date(`${targetLocalStr}Z`).getTime();
    if (diff === 0) {
      break;
    }
    utcMillis -= diff;
  }
  return new Date(utcMillis);
}

export function getBusinessLocalDateString(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}
