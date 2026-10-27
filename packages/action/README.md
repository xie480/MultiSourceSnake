# `@snk/action`

The GitHub Docker Action builds its container from the fork's root `Dockerfile`, so a workflow that references this repository runs the fork's code rather than the original prebuilt image.

## Inputs

| Input           | Required | Default | Description                                                                      |
| --------------- | -------- | ------- | -------------------------------------------------------------------------------- |
| `GITHUB_USER`   | Yes      | —       | GitHub account to query                                                          |
| `GITHUB_TOKEN`  | Yes      | —       | GraphQL token; use a PAT with `read:user` to include private contribution counts |
| `GITEE_USER`    | No       | —       | Gitee account; omitted to skip Gitee                                             |
| `GITEE_TOKEN`   | No       | —       | Optional Gitee API token                                                         |
| `GITCODE_USER`  | No       | —       | GitCode account; omitted to skip GitCode                                         |
| `GITCODE_TOKEN` | No       | —       | Required when `GITCODE_USER` is set                                              |
| `WINDOW_DAYS`   | No       | `365`   | Rolling UTC window, from 1 to 366 days                                           |
| `outputs`       | Yes      | —       | Newline-separated SVG/GIF output paths                                           |

The heatmap and totals count commits from all enabled platforms. GIF frames display the rolling-window total and how many commits the snake has eaten. A GitHub Profile README can display the generated static image, but visitors cannot switch its year interactively. See the repository root README for a complete profile workflow.

## Build

```sh
yarn install
yarn type
yarn build:action
```
