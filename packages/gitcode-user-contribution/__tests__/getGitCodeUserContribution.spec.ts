import { createContributionWindow } from "@snk/types/contribution";
import { getGitCodeUserContribution } from "..";

const makeResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body } as Response);

describe("getGitCodeUserContribution", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("merges PushEvent counts across years and follows next cursors", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        makeResponse({
          events: {
            "2024-12-31": [{ push_data: { commit_count: 2 } }],
          },
          next: "2024-12-01T00:00:00.000Z",
        })
      )
      .mockResolvedValueOnce(
        makeResponse({
          events: {
            "2024-12-01": [{ push_data: { commit_count: 99 } }],
          },
          next: null,
        })
      )
      .mockResolvedValueOnce(
        makeResponse({
          events: {
            "2025-01-01": [
              { push_data: { commit_count: 3 } },
              { push_data: { commit_count: 1 } },
            ],
            "2025-01-02": [{ push_data: { commit_count: 4 } }],
          },
          next: null,
        })
      );
    global.fetch = fetchMock;

    const result = await getGitCodeUserContribution("octocat", {
      gitcodeToken: "secret-token",
      window: createContributionWindow(3, new Date("2025-01-02T12:00:00Z")),
    });

    expect(result).toEqual([
      { date: "2024-12-31", count: 2 },
      { date: "2025-01-01", count: 4 },
      { date: "2025-01-02", count: 4 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain("year=2024");
    expect(String(fetchMock.mock.calls[1][0])).toContain("next=2024-12-01");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("secret-token");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer secret-token",
    });
  });

  it("fails when the server repeats a pagination cursor", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        makeResponse({ events: {}, next: "2025-01-01T00:00:00.000Z" })
      );

    await expect(
      getGitCodeUserContribution("octocat", {
        gitcodeToken: "token",
        window: createContributionWindow(1, new Date("2025-01-02T12:00:00Z")),
      })
    ).rejects.toThrow("pagination cursor repeated");
  });

  it("rejects malformed push commit counts", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      makeResponse({
        events: {
          "2024-03-01": [{ push_data: { commit_count: 1.5 } }],
        },
      })
    );

    await expect(
      getGitCodeUserContribution("gitcode-user", {
        gitcodeToken: "token",
        window: createContributionWindow(1, new Date("2024-03-01T12:00:00Z")),
      })
    ).rejects.toThrow("invalid commit count");
  });
});
