# LOKI Apps

The app registry for [LOKI](https://github.com/LOKI-Server/LOKI). Browse it at
**https://loki-server.github.io/apps/**, or install apps from your LOKI under
**Applications → Browse apps**.

Each app is a folder in `apps/`:

```
apps/<app-id>/app.json   # the latest release: version, download link, SHA-256
apps/<app-id>/icon.png   # optional: square PNG, 64–1024 px, up to 256 KiB
```

Every push to `master` rebuilds the site and its `index.json`, which LOKI reads.
LOKI downloads a release only if its SHA-256 matches the entry, so it installs
exactly the file that was reviewed.

## Add or update an app

1. Publish your `.loki-app` somewhere with a permanent https link, such as a
   GitHub release asset. Build it with `cargo loki package`.
2. Fork and clone this repository, then run, from its root:

   ```
   cargo loki registry add <download-link> --source <your repository> [--icon icon.png]
   ```

   This downloads the package, checks it, and writes `apps/<app-id>/app.json`.
   To update an app later, run the same command with the new release's link.
3. Open a pull request. For a new app, add a line for its folder to `CODEOWNERS`
   so later updates need your approval.

The folder name is the app ID, and the first app to claim an ID keeps it.

## Reviewing a pull request

```
cargo loki registry check
```

checks every entry and downloads each package to confirm it matches its entry
(`--offline` skips the downloads). `node build.mjs` builds the site into `_site/`.
