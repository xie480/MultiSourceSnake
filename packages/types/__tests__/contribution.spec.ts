import {
  createContributionWindow,
  splitContributionWindow,
} from "../contribution";

describe("createContributionWindow", () => {
  it("returns an inclusive UTC window and includes leap days", () => {
    const window = createContributionWindow(
      3,
      new Date("2024-03-01T13:15:00Z")
    );

    expect(window).toEqual({
      startDate: "2024-02-28",
      endDate: "2024-03-01",
      endAt: "2024-03-01T13:15:00.000Z",
      dates: ["2024-02-28", "2024-02-29", "2024-03-01"],
    });
  });

  it("uses the UTC day when the local offset crosses midnight", () => {
    const window = createContributionWindow(
      1,
      new Date("2024-01-01T01:00:00+08:00")
    );

    expect(window.dates).toEqual(["2023-12-31"]);
  });

  it("rejects invalid window sizes", () => {
    expect(() => createContributionWindow(0)).toThrow("windowDays");
    expect(() => createContributionWindow(367)).toThrow("windowDays");
    expect(() => createContributionWindow(1.5)).toThrow("windowDays");
  });
});

describe("splitContributionWindow", () => {
  it("splits a window into bounded, non-overlapping date chunks", () => {
    const window = createContributionWindow(
      65,
      new Date("2024-03-05T00:00:00Z")
    );

    expect(splitContributionWindow(window, 31)).toEqual([
      { startDate: "2024-01-01", endDate: "2024-01-31" },
      { startDate: "2024-02-01", endDate: "2024-03-02" },
      { startDate: "2024-03-03", endDate: "2024-03-05" },
    ]);
  });
});
