jest.mock("@snk/github-user-contribution", () => ({
  getGithubUserCommitContributions: jest.fn(),
}));
jest.mock("@snk/gitee-user-contribution", () => ({
  getGiteeUserContribution: jest.fn(),
}));
jest.mock("@snk/gitcode-user-contribution", () => ({
  getGitCodeUserContribution: jest.fn(),
}));
jest.mock("@snk/gif-creator", () => ({ createGif: jest.fn() }));
jest.mock("@snk/svg-creator", () => ({ createSvg: jest.fn() }));
jest.mock("@snk/solver/getBestRoute", () => ({ getBestRoute: () => [] }));
jest.mock("@snk/solver/getPathToPose", () => ({ getPathToPose: () => [] }));

import { createContributionWindow } from "@snk/types/contribution";
import { generateContributionSnake } from "../generateContributionSnake";
import { parseOutputsOption } from "../outputsOptions";

const mockGetGithubCommits = jest.requireMock("@snk/github-user-contribution")
  .getGithubUserCommitContributions as jest.Mock;
const mockGetGiteeCommits = jest.requireMock("@snk/gitee-user-contribution")
  .getGiteeUserContribution as jest.Mock;
const mockGetGitCodeCommits = jest.requireMock("@snk/gitcode-user-contribution")
  .getGitCodeUserContribution as jest.Mock;
const mockCreateGif = jest.requireMock("@snk/gif-creator")
  .createGif as jest.Mock;
const mockCreateSvg = jest.requireMock("@snk/svg-creator")
  .createSvg as jest.Mock;

describe("generateContributionSnake", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGithubCommits.mockResolvedValue([]);
    mockGetGiteeCommits.mockResolvedValue([]);
    mockGetGitCodeCommits.mockResolvedValue([]);
    mockCreateGif.mockResolvedValue(Buffer.from("gif"));
    mockCreateSvg.mockReturnValue("<svg />");
  });

  it("merges all enabled sources and passes total and per-cell counts to GIF rendering", async () => {
    const now = new Date("2024-03-01T12:00:00Z");
    const window = createContributionWindow(3, now);
    mockGetGithubCommits.mockResolvedValue([
      { date: window.dates[0], count: 2 },
    ]);
    mockGetGiteeCommits.mockResolvedValue([
      { date: window.dates[0], count: 3 },
    ]);
    mockGetGitCodeCommits.mockResolvedValue([
      { date: window.dates[2], count: 4 },
    ]);
    const outputs = parseOutputsOption(["dist/out.gif"]);

    const results = await generateContributionSnake(
      "github-user",
      "gitee-user",
      "gitcode-user",
      outputs,
      {
        githubToken: "github-token",
        giteeToken: "gitee-token",
        gitcodeToken: "gitcode-token",
        windowDays: 3,
        now,
      }
    );

    expect(results).toEqual([Buffer.from("gif")]);
    expect(mockGetGithubCommits).toHaveBeenCalledWith("github-user", {
      githubToken: "github-token",
      window: expect.objectContaining({ dates: expect.any(Array) }),
    });
    expect(mockGetGiteeCommits).toHaveBeenCalledWith("gitee-user", {
      giteeToken: "gitee-token",
      window: expect.objectContaining({ dates: expect.any(Array) }),
    });
    expect(mockGetGitCodeCommits).toHaveBeenCalledWith("gitcode-user", {
      gitcodeToken: "gitcode-token",
      window: expect.objectContaining({ dates: expect.any(Array) }),
    });

    const stats = mockCreateGif.mock.calls[0][5];
    expect(stats.totalCommits).toBe(9);
    expect(stats.windowDays).toBe(3);
    expect(
      [...stats.commitsByCell.values()].reduce(
        (sum: number, n: number) => sum + n,
        0
      )
    ).toBe(9);
  });

  it("keeps Gitee optional and requires a token if GitCode is configured", async () => {
    const outputs = parseOutputsOption(["dist/out.gif"]);

    await expect(
      generateContributionSnake("github-user", "", "gitcode-user", outputs, {
        githubToken: "github-token",
        windowDays: 1,
      })
    ).rejects.toThrow("GitCode token is required");

    expect(mockGetGiteeCommits).not.toHaveBeenCalled();
  });
});
