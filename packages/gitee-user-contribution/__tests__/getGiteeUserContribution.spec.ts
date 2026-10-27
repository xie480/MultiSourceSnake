import { createContributionWindow } from "@snk/types/contribution";
import { getGiteeUserContribution } from "..";

const makeResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body } as Response);

describe("getGiteeUserContribution", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("counts PushEvent commits by UTC date and sends credentials in a header", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      makeResponse([
        {
          id: 10,
          type: "PushEvent",
          created_at: "2024-03-01T23:00:00-02:00",
          payload: { size: 3, commits: [{}, {}] },
        },
        {
          id: 9,
          type: "PushEvent",
          created_at: "2024-03-01T10:00:00Z",
          payload: { commits: [{}, {}] },
        },
        {
          id: 8,
          type: "IssuesEvent",
          created_at: "2024-03-01T12:00:00Z",
          payload: { size: 100 },
        },
      ])
    );
    global.fetch = fetchMock;

    const result = await getGiteeUserContribution("user/name", {
      giteeToken: "secret-token",
      window: createContributionWindow(3, new Date("2024-03-02T12:00:00Z")),
    });

    expect(result).toEqual([
      { date: "2024-03-01", count: 2 },
      { date: "2024-03-02", count: 3 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = fetchMock.mock.calls[0];
    expect(requestUrl).not.toContain("secret-token");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer secret-token",
    });
  });

  it("paginates with prev_id when a page is full", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: 200 - index,
      type: "PushEvent",
      created_at: "2024-03-01T10:00:00Z",
      payload: { size: 1 },
    }));
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeResponse(firstPage))
      .mockResolvedValueOnce(
        makeResponse([
          {
            id: 100,
            type: "PushEvent",
            created_at: "2024-03-01T09:00:00Z",
            payload: { size: 2 },
          },
        ])
      );
    global.fetch = fetchMock;

    const result = await getGiteeUserContribution("octocat", {
      window: createContributionWindow(1, new Date("2024-03-01T12:00:00Z")),
    });

    expect(result).toEqual([{ date: "2024-03-01", count: 102 }]);
    expect(String(fetchMock.mock.calls[1][0])).toContain("prev_id=101");
  });
});
