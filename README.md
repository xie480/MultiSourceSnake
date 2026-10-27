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

### Configure repository secrets and variables

Configure these values in the **profile repository that contains the workflow**, not in the `MultiSourceSnake` action repository. For example, the profile repository for `https://github.com/xie480` is `xie480/xie480`.

GitHub’s current repository settings path is:

1. Open the profile repository and click **Settings** in the repository tab bar. If the tab bar hides it, open the repository’s `…` menu and choose **Settings**.
2. In the left sidebar, find **Security and quality**. Expand **Secrets and variables**, then click its **Actions** item.
3. The page is titled **Actions secrets and variables**. At the top of the page, choose the **Secrets** or **Variables** tab. Use the **Repository** sections below; this workflow does not declare an environment.

To add the GitCode token:

1. Choose **Secrets**.
2. Under **Repository secrets**, click **New repository secret**.
3. Enter `GITCODE_TOKEN` in **Name**.
4. Paste the personal access token you created on GitCode into **Secret**, then click **Add secret**.

Do not put the token in a variable, workflow YAML, README, or chat. Add `GITEE_TOKEN` the same way only if you want to include Gitee and have a Gitee token. The token values are write-only in GitHub; the settings page shows the secret names but not their values.

To add the GitCode account name:

1. Return to **Actions secrets and variables** and choose **Variables**.
2. Under **Repository variables**, click **New repository variable**.
3. Enter `GITCODE_USER` in **Name** and your GitCode username in **Value**, then click **Add variable**.

Add `GITEE_USER` in the same way if you want to include Gitee. Use each provider’s actual account name; it may differ from your GitHub username. GitHub currently validates variable names to use only letters, digits, and underscores, not to start with a digit, and not to start with `GITHUB_`; the names above follow those rules. The action skips a provider when its username is empty. GitHub’s own username is already supplied by `${{ github.repository_owner }}` in the workflow.

| Provider | Repository variable | Repository secret | Required to enable that provider? |
| --- | --- | --- | --- |
| GitHub | None | None for public data; use the automatically provided `GITHUB_TOKEN` | Yes, `GITHUB_USER` and `GITHUB_TOKEN` are already wired in the workflow |
| GitCode | `GITCODE_USER` | `GITCODE_TOKEN` | Both |
| Gitee | `GITEE_USER` | `GITEE_TOKEN` is optional | `GITEE_USER`; the token is optional |

Do not create a secret named `GITHUB_TOKEN`: GitHub Actions provides `${{ secrets.GITHUB_TOKEN }}` for each run. To include private GitHub contributions, create a separate personal access token with `read:user`, save it as `GH_CONTRIBUTION_TOKEN`, then change the workflow input to `GITHUB_TOKEN: ${{ secrets.GH_CONTRIBUTION_TOKEN }}`.

### Add and run the workflow

In the profile repository, create `.github/workflows/contribution-snake.yml` from **Code → Add file → Create new file**. If `.github/workflows` already exists, enter the full path in the filename field. Paste the workflow above and replace `YOUR_FORK_OWNER` with the owner of your action fork. Commit the new file to the profile repository’s default branch so GitHub can register the workflow.

For a first run, open the repository’s **Actions** tab, select **Update multi-source contribution snake**, choose **Run workflow**, and start it on the branch containing the workflow file. The workflow has `workflow_dispatch` enabled for this manual run and `schedule` enabled for its daily refresh. On success, the action writes `dist/multisource-snake.gif` and the final step commits it to the profile repository.

The workflow example uses `@v1`, which requires a `v1` tag to have been published in your action fork. Until then, use an existing branch as the action ref. For this repository’s current GitCode feature branch, the ref is:

```yaml
uses: xie480/MultiSourceSnake@yilena/gitcode-yearly-snake
```

After you publish a stable `v1` tag, switch the `uses` line to `xie480/MultiSourceSnake@v1` (or use your own fork owner if the action is forked again).

### Display it in the profile README

In the profile repository’s root `README.md`, keep the rest of your profile content and add this image where you want the animation to appear. If an older snake is already present, replace its image source to avoid showing two snakes:

```markdown
![Last 365 days of GitHub, Gitee, and GitCode commits; the animation shows commits eaten](./dist/multisource-snake.gif)
```

The path is relative to the profile repository root. The README image is refreshed by the scheduled workflow. A README image cannot provide a visitor-controlled year selector; this GIF always shows the latest rolling 365-day window.

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

## Troubleshooting Gitee network errors

If the log ends with `fetch failed` while fetching Gitee, the request did not receive an HTTP response. This is different from an HTTP status such as `401` or `403`; the log alone cannot identify whether the runner encountered DNS, TLS, timeout, or connection-reset trouble. The action retries network-level failures up to three times and prints the nested network cause and error code when available. The request URL and token are not printed. If all retries fail, inspect the cause code in the final error; an HTTP status instead points to the API response and should be diagnosed separately.

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
