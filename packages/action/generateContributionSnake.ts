import { getGithubUserCommitContributions } from "@snk/github-user-contribution";
import { getGiteeUserContribution } from "@snk/gitee-user-contribution";
import { getGitCodeUserContribution } from "@snk/gitcode-user-contribution";
import { userContributionToGrid } from "./userContributionToGrid";
import {
  commitCountsByCell,
  mergeDailyCommitCounts,
  totalCommitCount,
} from "./contributions";
import {
  createContributionWindow,
  type DailyCommitCount,
} from "@snk/types/contribution";
import { getBestRoute } from "@snk/solver/getBestRoute";
import { snake4 } from "@snk/types/__fixtures__/snake";
import { getPathToPose } from "@snk/solver/getPathToPose";
import type { DrawOptions as DrawOptions } from "@snk/svg-creator";
import type { AnimationOptions } from "@snk/gif-creator";

export const generateContributionSnake = async (
  githubUserName: string,
  giteeUserName: string,
  gitcodeUserName: string,
  outputs: ({
    format: "svg" | "gif";
    drawOptions: DrawOptions;
    animationOptions: AnimationOptions;
  } | null)[],
  options: {
    githubToken: string;
    giteeToken?: string;
    gitcodeToken?: string;
    windowDays?: number;
    now?: Date;
  }
) => {
  const window = createContributionWindow(
    options.windowDays ?? 365,
    options.now
  );
  if (gitcodeUserName && !options.gitcodeToken) {
    throw new Error(
      "GitCode token is required when GITCODE_USER is configured"
    );
  }
  const dailySources: DailyCommitCount[][] = [];

  console.log("🎣 fetching GitHub commit contributions");
  dailySources.push(
    await getGithubUserCommitContributions(githubUserName, {
      githubToken: options.githubToken,
      window,
    })
  );

  if (giteeUserName) {
    console.log("🎣 fetching Gitee push contributions");
    dailySources.push(
      await getGiteeUserContribution(giteeUserName, {
        giteeToken: options.giteeToken,
        window,
      })
    );
  }

  if (gitcodeUserName) {
    console.log("🎣 fetching GitCode push contributions");
    dailySources.push(
      await getGitCodeUserContribution(gitcodeUserName, {
        gitcodeToken: options.gitcodeToken ?? "",
        window,
      })
    );
  }

  const cells = mergeDailyCommitCounts(window, dailySources);
  const commitsTotal = totalCommitCount(cells);
  const commitsByCell = commitCountsByCell(cells);

  const grid = userContributionToGrid(cells);
  const snake = snake4;

  console.log("📡 computing best route");
  const chain = getBestRoute(grid, snake)!;
  chain.push(...getPathToPose(chain.slice(-1)[0], snake)!);

  return Promise.all(
    outputs.map(async (out, i) => {
      if (!out) return;
      const { format, drawOptions, animationOptions } = out;
      switch (format) {
        case "svg": {
          console.log(`🖌 creating svg (outputs[${i}])`);
          const { createSvg } = await import("@snk/svg-creator");
          return createSvg(grid, cells, chain, drawOptions, animationOptions);
        }
        case "gif": {
          console.log(`📹 creating gif (outputs[${i}])`);
          const { createGif } = await import("@snk/gif-creator");
          return await createGif(
            grid,
            cells,
            chain,
            drawOptions,
            animationOptions,
            {
              totalCommits: commitsTotal,
              windowDays: window.dates.length,
              commitsByCell,
            }
          );
        }
      }
    })
  );
};
