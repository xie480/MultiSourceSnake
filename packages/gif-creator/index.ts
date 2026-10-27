import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { createCanvas } from "canvas";
import { Grid, copyGrid, Color } from "@snk/types/grid";
import { Snake } from "@snk/types/snake";
import {
  Options as DrawOptions,
  drawLerpWorld,
  getCanvasWorldSize,
} from "@snk/draw/drawWorld";
import type { Point } from "@snk/types/point";
import { step } from "@snk/solver/step";
import { getHeadX, getHeadY } from "@snk/types/snake";
import { formatCommitProgress, recordEatenCommits } from "./progress";
import tmp from "tmp";
import gifsicle from "gifsicle";
// @ts-ignore
import GIFEncoder from "gif-encoder-2";

const withTmpDir = async <T>(
  handler: (dir: string) => Promise<T>
): Promise<T> => {
  const { name: dir, removeCallback: cleanUp } = tmp.dirSync({
    unsafeCleanup: true,
  });

  try {
    return await handler(dir);
  } finally {
    cleanUp();
  }
};

export type AnimationOptions = { frameDuration: number; step: number };
export type CommitStats = {
  totalCommits: number;
  windowDays: number;
  commitsByCell: Map<string, number>;
};

export const createGif = async (
  grid0: Grid,
  cells: Point[] | null,
  chain: Snake[],
  drawOptions: DrawOptions,
  animationOptions: AnimationOptions,
  commitStats?: CommitStats
) =>
  withTmpDir(async (dir) => {
    const { width, height } = getCanvasWorldSize(grid0, drawOptions);
    const headerHeight = commitStats
      ? Math.max(20, drawOptions.sizeCell + 4)
      : 0;

    const canvas = createCanvas(width, height + headerHeight);
    const ctx = canvas.getContext("2d") as any as CanvasRenderingContext2D;

    const grid = copyGrid(grid0);
    const stack: Color[] = [];
    let eatenCommits = 0;

    const encoder = new GIFEncoder(
      width,
      height + headerHeight,
      "neuquant",
      true
    );
    encoder.setRepeat(0);
    encoder.setDelay(animationOptions.frameDuration);
    encoder.start();

    for (let i = 0; i < chain.length; i += 1) {
      const snake0 = chain[i];
      const snake1 = chain[Math.min(chain.length - 1, i + 1)];
      const eatenColor = step(grid, stack, snake0);
      if (eatenColor && commitStats) {
        eatenCommits = recordEatenCommits(
          eatenCommits,
          getHeadX(snake0),
          getHeadY(snake0),
          commitStats.commitsByCell
        );
      }

      for (let k = 0; k < animationOptions.step; k++) {
        ctx.clearRect(0, 0, width, height + headerHeight);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height + headerHeight);
        ctx.save();
        if (headerHeight > 0) ctx.translate(0, headerHeight);
        drawLerpWorld(
          ctx,
          grid,
          cells,
          snake0,
          snake1,
          stack,
          k / animationOptions.step,
          drawOptions
        );
        ctx.restore();

        if (commitStats) {
          ctx.save();
          ctx.fillStyle = drawOptions.colorSnake;
          ctx.font = `bold ${Math.max(
            12,
            drawOptions.sizeCell - 2
          )}px sans-serif`;
          ctx.textBaseline = "middle";
          ctx.fillText(
            formatCommitProgress(
              commitStats.windowDays,
              commitStats.totalCommits,
              eatenCommits
            ),
            drawOptions.sizeCell,
            headerHeight / 2
          );
          ctx.restore();
        }

        encoder.addFrame(ctx);
      }
    }

    const outFileName = path.join(dir, "out.gif");
    const optimizedFileName = path.join(dir, "out.optimized.gif");

    encoder.finish();
    fs.writeFileSync(outFileName, encoder.out.getData());

    execFileSync(
      gifsicle,
      [
        //
        "--optimize=3",
        "--color-method=diversity",
        "--colors=18",
        outFileName,
        ["--output", optimizedFileName],
      ].flat()
    );

    return fs.readFileSync(optimizedFileName);
  });
