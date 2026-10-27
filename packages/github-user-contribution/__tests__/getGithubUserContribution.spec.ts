import { createContributionWindow } from "@snk/types/contribution";
import { getGithubUserCommitContributions } from "..";

const makeResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
  } as Response);

describe("getGithubUserCommitContributions", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("aggregates exact per-day commit counts and checks the interval total", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      makeResponse({
        data: {
          user: {
            contributionsCollection: {
              totalCommitContributions: 10,
              commitContributionsByRepository: [
                {
                  contributions: {
                    nodes: [
                      { occurredAt: "2024-02-28T10:00:00Z", commitCount: 2 },
                      { occurredAt: "2024-02-29T10:00:00Z", commitCount: 1 },
                    ],
                    pageInfo: { hasNextPage: false },
                  },
                },
                {
                  contributions: {
                    nodes: [
                      { occurredAt: "2024-02-28T12:00:00Z", commitCount: 3 },
                      { occurredAt: "2024-03-01T12:00:00Z", commitCount: 4 },
                    ],
                    pageInfo: { hasNextPage: false },
                  },
                },
              ],
            },
          },
        },
      })
    );
    global.fetch = fetchMock;

    const result = await getGithubUserCommitContributions("octocat", {
      githubToken: "secret-token",
      window: createContributionWindow(3, new Date("2024-03-01T12:00:00Z")),
    });

    expect(result).toEqual([
      { date: "2024-02-28", count: 5 },
      { date: "2024-02-29", count: 1 },
      { date: "2024-03-01", count: 4 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/graphql");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer secret-token",
    });
    expect(String(url)).not.toContain("secret-token");
    expect(String((init as RequestInit).body)).not.toContain("secret-token");
    expect((init as RequestInit).body).toContain("maxRepositories: 100");
  });

  it("fails instead of accepting incomplete repository pages", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      makeResponse({
        data: {
          user: {
            contributionsCollection: {
              totalCommitContributions: 1,
              commitContributionsByRepository: [
                {
                  contributions: {
                    nodes: [],
                    pageInfo: { hasNextPage: true },
                  },
                },
              ],
            },
          },
        },
      })
    );

    await expect(
      getGithubUserCommitContributions("octocat", {
        githubToken: "token",
        window: createContributionWindow(1, new Date("2024-03-01T12:00:00Z")),
      })
    ).rejects.toThrow("more than 100 daily records");
  });

  it("fails when day records do not reconcile with GitHub's total", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      makeResponse({
        data: {
          user: {
            contributionsCollection: {
              totalCommitContributions: 2,
              commitContributionsByRepository: [
                {
                  contributions: {
                    nodes: [
                      { occurredAt: "2024-03-01T12:00:00Z", commitCount: 1 },
                    ],
                    pageInfo: { hasNextPage: false },
                  },
                },
              ],
            },
          },
        },
      })
    );

    await expect(
      getGithubUserCommitContributions("octocat", {
        githubToken: "token",
        window: createContributionWindow(1, new Date("2024-03-01T12:00:00Z")),
      })
    ).rejects.toThrow("daily sum 1 does not match API total 2");
  });
});
