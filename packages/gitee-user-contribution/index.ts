import type {
  ContributionWindow,
  DailyCommitCount,
} from "@snk/types/contribution";

type GiteeEvent = {
  id?: number | string;
  type?: string;
  created_at?: string;
  payload?: {
    size?: number;
    commits?: unknown[];
  };
};

const PAGE_SIZE = 100;
const MAX_PAGES = 1000;

const getPushCommitCount = (event: GiteeEvent) => {
  if (event.type !== "PushEvent") return 0;

  const explicitCount = Number(event.payload?.size);
  if (Number.isInteger(explicitCount) && explicitCount >= 0)
    return explicitCount;

  return event.payload?.commits?.length ?? 0;
};

/** Fetch Gitee push events in the requested UTC date window using prev_id paging. */
export const getGiteeUserContribution = async (
  userName: string,
  options: { giteeToken?: string; window: ContributionWindow }
): Promise<DailyCommitCount[]> => {
  if (!userName.trim()) throw new Error("Gitee username is required");

  const byDate = new Map<string, number>();
  const seenCursors = new Set<string>();
  let previousId: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(
      `https://gitee.com/api/v5/users/${encodeURIComponent(userName)}/events`
    );
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (previousId) url.searchParams.set("prev_id", previousId);

    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.giteeToken) {
      headers.Authorization = `Bearer ${options.giteeToken}`;
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(
        `Gitee events request failed with status ${response.status}`
      );
    }

    const events = (await response.json()) as GiteeEvent[];
    if (!Array.isArray(events)) {
      throw new Error("Gitee events response was not an array");
    }
    if (events.length === 0) return toDailyCounts(byDate);

    for (const event of events) {
      if (!event.created_at) continue;
      const timestamp = new Date(event.created_at);
      if (Number.isNaN(timestamp.getTime())) continue;
      const date = timestamp.toISOString().slice(0, 10);
      if (date < options.window.startDate || date > options.window.endDate)
        continue;

      const count = getPushCommitCount(event);
      if (count > 0) byDate.set(date, (byDate.get(date) ?? 0) + count);
    }

    const oldestDate = events.reduce<string | undefined>((oldest, event) => {
      if (!event.created_at) return oldest;
      const timestamp = new Date(event.created_at);
      if (Number.isNaN(timestamp.getTime())) return oldest;
      const date = timestamp.toISOString().slice(0, 10);
      return oldest === undefined || date < oldest ? date : oldest;
    }, undefined);
    if (oldestDate && oldestDate < options.window.startDate) {
      return toDailyCounts(byDate);
    }
    if (events.length < PAGE_SIZE) return toDailyCounts(byDate);

    const lastId = events[events.length - 1].id;
    if (lastId === undefined || lastId === null) {
      throw new Error("Gitee events response did not include a pagination id");
    }
    const cursor = String(lastId);
    if (seenCursors.has(cursor)) {
      throw new Error("Gitee events pagination cursor repeated");
    }
    seenCursors.add(cursor);
    previousId = cursor;
  }

  throw new Error(`Gitee events exceeded the ${MAX_PAGES}-page safety limit`);
};

const toDailyCounts = (byDate: Map<string, number>): DailyCommitCount[] =>
  Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

export type Res = Awaited<ReturnType<typeof getGiteeUserContribution>>;
export type Cell = Res[number];
