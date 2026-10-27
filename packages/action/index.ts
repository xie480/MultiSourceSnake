import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import { parseOutputsOption } from "./outputsOptions";

(async () => {
  try {
    const outputs = parseOutputsOption(
      core.getMultilineInput("outputs") ?? [
        core.getInput("gif_out_path"),
        core.getInput("svg_out_path"),
      ]
    );

    // const entries = [
    //   path.join(__dirname, "/github/workspace/output/out.svg"),

    //   path.join(__dirname, "/github/workspace/output/out-dark.svg") +
    //     "?palette=github-dark&color_snake=orange",

    //   path.join(__dirname, "/github/workspace/output/out.gif") +
    //     "?color_snake=orange&color_dots=#d4e0f0,#8dbdff,#64a1f4,#4b91f1,#3c7dd9",
    // ];

    const githubUserName = core.getInput("GITHUB_USER", { required: true });
    const giteeUserName = core.getInput("GITEE_USER");
    const gitcodeUserName = core.getInput("GITCODE_USER");
    const githubToken = core.getInput("GITHUB_TOKEN", { required: true });
    const giteeToken = core.getInput("GITEE_TOKEN");
    const gitcodeToken = core.getInput("GITCODE_TOKEN");
    const windowDaysInput = core.getInput("WINDOW_DAYS") || "365";
    const windowDays = Number(windowDaysInput);
    if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 366) {
      throw new Error("WINDOW_DAYS must be an integer between 1 and 366");
    }

    const { generateContributionSnake } = await import(
      "./generateContributionSnake"
    );
    const results = await generateContributionSnake(
      githubUserName,
      giteeUserName,
      gitcodeUserName,
      outputs,
      {
        githubToken,
        giteeToken,
        gitcodeToken,
        windowDays,
      }
    );
    console.log("Done Computing Result.");
    console.log(results.length);

    outputs.forEach((out, i) => {
      const result = results[i];
      if (out?.filename && result) {
        console.log(`💾 writing to ${out?.filename}`);
        fs.mkdirSync(path.dirname(out?.filename), { recursive: true });
        fs.writeFileSync(out?.filename, result);
      }
    });
  } catch (e: any) {
    core.setFailed(`Action failed with "${e.message}"`);
  }
})();
