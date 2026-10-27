/**
 * get the contribution grid from a github user page
 *
 * use options.from=YYYY-MM-DD options.to=YYYY-MM-DD to get the contribution grid for a specific time range
 * or year=2019 as an alias for from=2019-01-01 to=2019-12-31
 *
 * otherwise return use the time range from today minus one year to today ( as seen in github profile page )
 *
 * @param userName github user name
 * @param options
 *
 * @example
 *  getGithubUserContribution("platane", { from: "2019-01-01", to: "2019-12-31" })
 *  getGithubUserContribution("platane", { year: 2019 })
 *
 */
export const getGithubUserContribution = async (
  userName: string,
  o: { githubToken: string }
) => {
  const query = /* GraphQL */ `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                contributionLevel
                weekday
                date
              }
            }
          }
        }
      }
    }
  `;

  const variables = { login: userName };
  const res = await fetch("https://api.github.com/graphql", {
    headers: {
      Authorization: `bearer ${o.githubToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({ variables, query }),
  });

  if (!res.ok) throw new Error(res.statusText);

  const { data, errors } = (await res.json()) as {
    data: GraphQLRes;
    errors?: { message: string }[];
  };

  if (errors?.[0]) throw errors[0];

  const result =
    data.user.contributionsCollection.contributionCalendar.weeks.flatMap(
      ({ contributionDays }, x) =>
        contributionDays.map((d) => ({
          x,
          y: d.weekday,
          date: d.date,
          count: d.contributionCount,
          level:
            (d.contributionLevel === "FOURTH_QUARTILE" && 4) ||
            (d.contributionLevel === "THIRD_QUARTILE" && 3) ||
            (d.contributionLevel === "SECOND_QUARTILE" && 2) ||
            (d.contributionLevel === "FIRST_QUARTILE" && 1) ||
            0,
        }))
    );
  return result;
};

type GraphQLRes = {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        weeks: {
          contributionDays: {
            contributionCount: number;
            contributionLevel:
              | "FOURTH_QUARTILE"
              | "THIRD_QUARTILE"
              | "SECOND_QUARTILE"
              | "FIRST_QUARTILE"
              | "NONE";
            date: string;
            weekday: number;
          }[];
        }[];
      };
    };
  };
};

export type Res = Awaited<ReturnType<typeof getGithubUserContribution>>;

export type Cell = Res[number];
import {
  splitContributionWindow,
  type ContributionWindow,
  type DailyCommitCount,
} from "@snk/types/contribution";

type GitHubCommitContributionResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        totalCommitContributions: number;
        commitContributionsByRepository: {
          contributions: {
            nodes: { occurredAt: string; commitCount: number }[];
            pageInfo: { hasNextPage: boolean };
          };
        }[];
      } | null;
    } | null;
  };
  errors?: { message: string }[];
};

const commitContributionsQuery = /* GraphQL */ `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        commitContributionsByRepository(maxRepositories: 100) {
          contributions(first: 100) {
            nodes {
              occurredAt
              commitCount
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch exact GitHub commit contributions by day. The time window is split so
 * that each repository can contribute at most 31 daily records per query.
 * The summed day records are checked against GitHub's interval total to avoid
 * silently accepting repository or private-contribution truncation.
 */
export const getGithubUserCommitContributions = async (
  userName: string,
  options: { githubToken: string; window: ContributionWindow }
): Promise<DailyCommitCount[]> => {
  if (!userName.trim()) throw new Error("GitHub username is required");
  if (!options.githubToken) throw new Error("GitHub token is required");

  const dailyCounts = new Map<string, number>();

  for (const chunk of splitContributionWindow(options.window, 31)) {
    const from = `${chunk.startDate}T00:00:00Z`;
    const to =
      chunk.endDate === options.window.endDate
        ? options.window.endAt
        : `${chunk.endDate}T23:59:59.999Z`;
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.githubToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: commitContributionsQuery,
        variables: { login: userName, from, to },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub GraphQL request failed with status ${response.status}`
      );
    }

    const result = (await response.json()) as GitHubCommitContributionResponse;
    if (result.errors?.length) {
      throw new Error(`GitHub GraphQL error: ${result.errors[0].message}`);
    }

    const collection = result.data?.user?.contributionsCollection;
    if (!collection) {
      throw new Error("GitHub user or contribution collection was not found");
    }

    for (const repository of collection.commitContributionsByRepository) {
      if (repository.contributions.pageInfo.hasNextPage) {
        throw new Error(
          `GitHub returned more than 100 daily records for ${chunk.startDate} to ${chunk.endDate}`
        );
      }

      for (const contribution of repository.contributions.nodes) {
        const date = new Date(contribution.occurredAt)
          .toISOString()
          .slice(0, 10);
        dailyCounts.set(
          date,
          (dailyCounts.get(date) ?? 0) + contribution.commitCount
        );
      }
    }

    const chunkTotal = Array.from(dailyCounts.entries())
      .filter(([date]) => date >= chunk.startDate && date <= chunk.endDate)
      .reduce((total, [, count]) => total + count, 0);
    if (chunkTotal !== collection.totalCommitContributions) {
      throw new Error(
        `GitHub commit data is incomplete for ${chunk.startDate} to ${chunk.endDate}: ` +
          `daily sum ${chunkTotal} does not match API total ${collection.totalCommitContributions}`
      );
    }
  }

  return Array.from(dailyCounts.entries())
    .filter(
      ([date]) =>
        date >= options.window.startDate && date <= options.window.endDate
    )
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};
