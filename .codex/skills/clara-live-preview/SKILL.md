---
name: clara-live-preview
description: Start, refresh, verify, or open the Clara's Stories website at localhost for visual review and sidebar annotation. Use for requests to pull up Clara's Stories, mirror the deployed GitHub Pages site, inspect the live-equivalent stories gallery, preview local Clara changes, or reopen this project's annotation view.
---

# Clara live preview

Use these fixed project details:

- Project: `/Users/marcusc/Documents/codex/Clara's Stories`
- Repository: `marcusc9/Clara-sStories`
- Deployed site: `https://marcusc9.github.io/Clara-sStories/`
- Local mirror: `http://127.0.0.1:3002/Clara-sStories/`
- Stories gallery: `http://127.0.0.1:3002/Clara-sStories/stories.html`

The site is static and needs no build step.

## Open the deployed-equivalent mirror

1. Check the local mirror with:

   ```bash
   curl -fsS http://127.0.0.1:3002/Clara-sStories/stories.html
   ```

2. Reuse it when healthy and the user only asks to reopen it.
3. Otherwise start a fresh `origin/main` snapshot:

   ```bash
   python3 "/Users/marcusc/Documents/codex/Clara's Stories/.codex/skills/clara-live-preview/scripts/clara_preview.py"
   ```

4. Keep the server process running.
5. Use the browser-control skill to show the stories gallery URL in the in-app browser. Keep that local tab as the deliverable annotation view.

The helper fetches `origin/main`, exports it to `/tmp`, and serves that snapshot under the same `/Clara-sStories/` base path as GitHub Pages. It does not modify the working tree.

## Preview uncommitted local work

When the user explicitly asks to inspect local changes rather than the deployed-equivalent site, run:

```bash
python3 "/Users/marcusc/Documents/codex/Clara's Stories/.codex/skills/clara-live-preview/scripts/clara_preview.py" --source workspace
```

Do not call a workspace preview a live mirror. Before using it, report whether `git status --short --branch` shows uncommitted or unpushed work.

## Refresh safely

For a requested refresh, stop only the preview process started for this project, then rerun the helper. Never kill an unknown process merely because it owns port 3002. Never reset, clean, checkout, or overwrite the project to match GitHub.

Use `--skip-fetch` only when network access is unavailable and clearly state that the mirror uses the last locally known `origin/main`.

## Verify

After starting or refreshing:

- Confirm the stories page title is `Stories | Clara's Stories`.
- Confirm `stories.js` and `styles.css` return HTTP 200.
- Confirm the browser console has no errors.
- For a live comparison, compare a bounded projection: page title, first story title, story count, stylesheet URL, and script URLs.
- Treat a temporary GitHub Pages deployment delay as distinct from a local mirror failure.

If verification fails, inspect the helper output and HTTP log before changing project source.
