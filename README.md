# Multi-Source Git Contribution Snake

Generate a snake animation from the **last 365 UTC days of commit activity** on GitHub, Gitee, and GitCode. The GIF displays the merged commit total and updates the number of commits eaten as the snake clears each active day.

The action creates static files, so it works in a GitHub Profile README without a hosted image service. Schedule the workflow to refresh the image and commit it to your profile repository.

## Use in a GitHub Profile README

Create a public repository named exactly after your GitHub username, then add `.github/workflows/contribution-snake.yml`:

```yaml
name: Update multi-source contribution snake

on:
  schedule:
    - cron: "17 2 * * *" # UTC, daily
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Generate the last 365 days
        uses: YOUR_FORK_OWNER/MultiSourceSnake@v1
        with:
          GITHUB_USER: ${{ github.repository_owner }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITEE_USER: ${{ vars.GITEE_USER }}
          GITEE_TOKEN: ${{ secrets.GITEE_TOKEN }}
          GITCODE_USER: ${{ vars.GITCODE_USER }}
          GITCODE_TOKEN: ${{ secrets.GITCODE_TOKEN }}
          WINDOW_DAYS: "365"
          outputs: |
            /github/workspace/dist/multisource-snake.gif

      - name: Commit generated image
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add dist/multisource-snake.gif
          if git diff --cached --quiet; then
            echo "No image changes"
            exit 0
          fi
          git commit -m "chore: update contribution snake"
          git push
```

Replace `YOUR_FORK_OWNER` with the owner of your fork. In the profile repository’s **Settings → Secrets and variables → Actions**, add `GITCODE_TOKEN` and, if used, `GITEE_TOKEN`. Add `GITCODE_USER` and `GITEE_USER` as Actions Variables. GitHub public contribution data can use the built-in token shown above. To include private GitHub contribution counts, create a personal access token with `read:user`, save it as a secret such as `GH_CONTRIBUTION_TOKEN`, and change the workflow input to `GITHUB_TOKEN: ${{ secrets.GH_CONTRIBUTION_TOKEN }}`.

Add this image reference to the profile `README.md`:

```markdown
![Last 365 days of GitHub, Gitee, and GitCode commits; the animation shows commits eaten](./dist/multisource-snake.gif)
```

The image is refreshed by the scheduled workflow. A README image cannot provide a visitor-controlled year selector; the GIF shows the latest rolling window.

## Action inputs

| Input           | Required | Default | Description                                          |
| --------------- | -------- | ------- | ---------------------------------------------------- |
| `GITHUB_USER`   | Yes      | —       | GitHub account to query                              |
| `GITHUB_TOKEN`  | Yes      | —       | GitHub GraphQL token                                 |
| `GITEE_USER`    | No       | —       | Gitee account; its events are skipped when empty     |
| `GITEE_TOKEN`   | No       | —       | Optional Gitee API token                             |
| `GITCODE_USER`  | No       | —       | GitCode account; its events are skipped when empty   |
| `GITCODE_TOKEN` | No       | —       | Required when `GITCODE_USER` is set                  |
| `WINDOW_DAYS`   | No       | `365`   | Rolling UTC window from 1 to 366 days                |
| `outputs`       | Yes      | —       | One output path per line; supports `.svg` and `.gif` |

## Statistics and data notes

- Heatmap intensity and total use per-day commit counts across enabled platforms.
- GitHub daily commit records are checked against its interval total. If the API returns incomplete repository coverage, generation fails instead of publishing a partial total.
- GitCode and Gitee events are paginated. API tokens are sent in request headers and are never printed in logs or placed in request URLs.
- A commit mirrored to more than one platform may be counted more than once; the total is a platform sum, not a cross-platform deduplicated count.
- GitHub’s built-in `GITHUB_TOKEN` may not include private contributions. Use a token with `read:user` when those counts are enabled on your profile.

## Development

```sh
yarn install
yarn test
yarn type
yarn build:action
```

The Docker Action is built from this fork’s `Dockerfile`; publish a version tag such as `v1` before referencing it from a profile workflow.

## Acknowledgements

Thanks to [Platane/snk](https://github.com/Platane/snk) for the original snake animation concept and implementation.
