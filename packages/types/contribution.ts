export type DailyCommitCount = {
  date: string;
  count: number;
};

export type ContributionWindow = {
  startDate: string;
  endDate: string;
  endAt: string;
  dates: string[];
};

export type ContributionCell = DailyCommitCount & {
  x: number;
  y: number;
  level: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const formatUtcDate = (date: Date) => date.toISOString().slice(0, 10);

export const createContributionWindow = (
  windowDays = 365,
  now = new Date()
): ContributionWindow => {
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 366) {
    throw new Error("windowDays must be an integer between 1 and 366");
  }

  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const start = new Date(end.getTime() - (windowDays - 1) * DAY_MS);
  const dates = Array.from({ length: windowDays }, (_, index) =>
    formatUtcDate(new Date(start.getTime() + index * DAY_MS))
  );

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    endAt: now.toISOString(),
    dates,
  };
};

export const splitContributionWindow = (
  window: ContributionWindow,
  chunkDays = 31
) => {
  if (!Number.isInteger(chunkDays) || chunkDays < 1) {
    throw new Error("chunkDays must be a positive integer");
  }

  const chunks: { startDate: string; endDate: string }[] = [];
  for (let index = 0; index < window.dates.length; index += chunkDays) {
    chunks.push({
      startDate: window.dates[index],
      endDate:
        window.dates[Math.min(index + chunkDays, window.dates.length) - 1],
    });
  }

  return chunks;
};
