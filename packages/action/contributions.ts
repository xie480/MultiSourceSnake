import type {
  ContributionCell,
  ContributionWindow,
  DailyCommitCount,
} from "@snk/types/contribution";

export const mergeDailyCommitCounts = (
  window: ContributionWindow,
  sources: DailyCommitCount[][]
): ContributionCell[] => {
  const counts = new Map(window.dates.map((date) => [date, 0]));

  for (const source of sources) {
    for (const item of source) {
      if (!counts.has(item.date)) continue;
      if (!Number.isInteger(item.count) || item.count < 0) {
        throw new Error(`Invalid commit count for ${item.date}`);
      }
      counts.set(item.date, counts.get(item.date)! + item.count);
    }
  }

  const firstWeekday = new Date(`${window.startDate}T00:00:00Z`).getUTCDay();
  return window.dates.map((date, index) => {
    const count = counts.get(date)!;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    return {
      date,
      count,
      x: Math.floor((firstWeekday + index) / 7),
      y: weekday,
      level: count > 10 ? 4 : count > 6 ? 3 : count > 3 ? 2 : count > 0 ? 1 : 0,
    };
  });
};

export const totalCommitCount = (cells: DailyCommitCount[]) =>
  cells.reduce((total, cell) => total + cell.count, 0);

export const commitCountsByCell = (cells: ContributionCell[]) =>
  new Map(cells.map((cell) => [`${cell.x},${cell.y}`, cell.count]));
