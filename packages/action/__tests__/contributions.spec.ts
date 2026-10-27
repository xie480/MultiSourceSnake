import { createContributionWindow } from "@snk/types/contribution";
import {
  commitCountsByCell,
  mergeDailyCommitCounts,
  totalCommitCount,
} from "../contributions";

describe("mergeDailyCommitCounts", () => {
  it("merges same-day platform commits and fills inactive days", () => {
    const window = createContributionWindow(
      3,
      new Date("2024-03-01T12:00:00Z")
    );
    const cells = mergeDailyCommitCounts(window, [
      [{ date: "2024-02-28", count: 2 }],
      [
        { date: "2024-02-28", count: 3 },
        { date: "2024-03-01", count: 1 },
      ],
    ]);

    expect(cells.map(({ date, count }) => ({ date, count }))).toEqual([
      { date: "2024-02-28", count: 5 },
      { date: "2024-02-29", count: 0 },
      { date: "2024-03-01", count: 1 },
    ]);
    expect(totalCommitCount(cells)).toBe(6);
  });

  it("maps each day onto a Sunday-first heatmap and derives cell commit counts", () => {
    const window = createContributionWindow(
      8,
      new Date("2024-03-03T12:00:00Z")
    );
    const cells = mergeDailyCommitCounts(window, [
      [{ date: "2024-02-25", count: 8 }],
    ]);

    expect(cells.find((cell) => cell.date === "2024-02-25")).toMatchObject({
      x: 0,
      y: 0,
      level: 3,
    });
    expect(commitCountsByCell(cells).get("0,0")).toBe(8);
  });

  it("rejects negative and fractional source values", () => {
    const window = createContributionWindow(
      1,
      new Date("2024-03-01T00:00:00Z")
    );

    expect(() =>
      mergeDailyCommitCounts(window, [[{ date: "2024-03-01", count: -1 }]])
    ).toThrow("Invalid commit count");
    expect(() =>
      mergeDailyCommitCounts(window, [[{ date: "2024-03-01", count: 1.5 }]])
    ).toThrow("Invalid commit count");
  });
});
