export const recordEatenCommits = (
  eatenCommits: number,
  x: number,
  y: number,
  commitsByCell: Map<string, number>
) => eatenCommits + (commitsByCell.get(`${x},${y}`) ?? 0);

export const formatCommitProgress = (
  windowDays: number,
  totalCommits: number,
  eatenCommits: number
) =>
  `Last ${windowDays} days: ${totalCommits} commits | Eaten: ${eatenCommits}/${totalCommits}`;
