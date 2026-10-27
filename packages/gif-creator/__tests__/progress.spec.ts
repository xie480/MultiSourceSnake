import { formatCommitProgress, recordEatenCommits } from "../progress";

describe("commit progress display", () => {
  it("adds the commits represented by a cell only when the caller eats it", () => {
    const commitsByCell = new Map([
      ["2,3", 4],
      ["4,3", 2],
    ]);

    expect(recordEatenCommits(0, 2, 3, commitsByCell)).toBe(4);
    expect(recordEatenCommits(4, 4, 3, commitsByCell)).toBe(6);
    expect(recordEatenCommits(6, 1, 1, commitsByCell)).toBe(6);
  });

  it("formats the rolling-window total and eaten count", () => {
    expect(formatCommitProgress(365, 42, 17)).toBe(
      "Last 365 days: 42 commits | Eaten: 17/42"
    );
  });
});
