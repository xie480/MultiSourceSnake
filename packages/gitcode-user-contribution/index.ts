import type {
  ContributionWindow,
  DailyCommitCount,
} from "@snk/types/contribution";

type GitCodeEvent = {
  push_data?: {
    commit_count?: number;
  };
};

type GitCodeEventsResponse = {
  events?: Record<string, GitCodeEvent[]>;
  next?: string | null;
};

const MAX_PAGES_PER_YEAR = 1000;

/** Fetch GitCode push events for all years intersecting a UTC date window. */
export const getGitCodeUserContribution = async (
  userName: string,
  options: { gitcodeToken: string; window: ContributionWindow }
): Promise<DailyCommitCount[]> => {
  if (!userName.trim()) throw new Error("GitCode username is required");
  if (!options.gitcodeToken) throw new Error("GitCode token is required");

  const firstYear = Number(options.window.startDate.slice(0, 4));
  const lastYear = Number(options.window.endDate.slice(0, 4));
  const byDate = new Map<string, number>();

  for (let year = firstYear; year <= lastYear; year += 1) {
    let next: string | undefined;
    const seenCursors = new Set<string>();

    for (let page = 0; page < MAX_PAGES_PER_YEAR; page += 1) {
      const url = new URL(
        `https://api.gitcode.com/api/v5/users/${encodeURIComponent(
          userName
        )}/events`
      );
      url.searchParams.set("year", String(year));
      if (next) url.searchParams.set("next", next);

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${options.gitcodeToken}`,
        },
      });
      if (!response.ok) {
        throw new Error(
          `GitCode events request failed with status ${response.status}`
        );
      }

      const result = (await response.json()) as GitCodeEventsResponse;
      if (!result.events || typeof result.events !== "object") {
        throw new Error(
          "GitCode events response did not include an events object"
        );
      }

      for (const [date, events] of Object.entries(result.events)) {
        if (date < options.window.startDate || date > options.window.endDate)
          continue;
        for (const event of events) {
          const rawCount = event.push_data?.commit_count;
          if (rawCount === undefined) continue;
          const count = Number(rawCount);
          if (!Number.isInteger(count) || count < 0) {
            throw new Error(
              `GitCode returned an invalid commit count for ${date}`
            );
          }
          if (count > 0) {
            byDate.set(date, (byDate.get(date) ?? 0) + count);
          }
        }
      }

      if (!result.next) break;
      if (seenCursors.has(result.next)) {
        throw new Error(
          `GitCode events pagination cursor repeated for ${year}`
        );
      }
      seenCursors.add(result.next);
      next = result.next;

      if (page === MAX_PAGES_PER_YEAR - 1) {
        throw new Error(
          `GitCode events exceeded the ${MAX_PAGES_PER_YEAR}-page safety limit for ${year}`
        );
      }
    }
  }

  return Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export type Res = Awaited<ReturnType<typeof getGitCodeUserContribution>>;
export type Cell = Res[number];
