# Contributing to mcp-cross

Thanks for helping improve `mcp-cross`! This guide outlines the common open-source practices we follow plus the steps for publishing new beta builds to npm.

> **Why this format?** There is no single industry-standard document for publication processes across open-source projects. Most teams follow variations of the [GitHub Open Source Guide](https://opensource.guide/) and the official [npm publishing docs](https://docs.npmjs.com/cli/v10/commands/npm-publish). The sections below adapt those widespread conventions to this repository.

## Development Workflow

1. **Fork & Clone**
   - Fork `seanepping/mcp-cross` and clone your fork.
   - Configure the upstream remote: `git remote add upstream git@github.com:seanepping/mcp-cross.git`.

2. **Create a Feature Branch**
   - Sync main: `git fetch upstream && git checkout main && git merge upstream/main`.
   - Create a branch using gitflow-style naming, e.g. `feature/better-logging` or `fix/wsl-path-bug`.

3. **Install & Develop**
   - Install dependencies: `npm install`.
   - Make focused, logically grouped commits. Use descriptive messages like `fix: normalize drive letters on Windows`.

4. **Testing & Quality**
   - Run the unit tests locally: `npm test`.
   - Add or update tests whenever you introduce new behavior.

5. **Pull Request Checklist**
   - Rebase on `upstream/main` if your branch is older than a day or so.
   - Ensure `npm test` is green.
   - Update documentation when behavior or CLI usage changes.
   - Open a PR against `seanepping/mcp-cross:main` with a clear summary of the change and testing evidence.

## Release & Publication Process (Beta)

Releases currently target the beta dist-tag on npm until we promote a stable `latest`.

1. **Prerequisites**
   - Maintainer permissions on npm for the `mcp-cross` package.
   - Logged into npm locally (2FA enabled if required): `npm whoami` should succeed.

2. **Versioning & Metadata**
   - Update `package.json` version (e.g., `1.0.0-beta.1`).
   - Confirm `publishConfig.tag` is `"beta"`.
   - Ensure the `files` allowlist contains every asset needed for the CLI.
   - Record notable changes in the README or future CHANGELOG.

3. **Quality Gates**
   - Run `npm test`.
   - Optionally run `npm pack` and inspect the tarball contents.

4. **Publish Command**

   ```bash
   npm publish --tag beta
   ```

   The explicit `--tag` keeps the release on the beta channel even if `publishConfig` is correct.

5. **Verification**
   - Check the dist-tags: `npm view mcp-cross dist-tags`.
   - Install the beta into a clean project: `npm install mcp-cross@beta` and smoke test.

6. **Promoting to Latest (Future)**
   - Once the beta is stable, bump the version to a non-beta semver (e.g., `1.0.0`).
   - Update `publishConfig.tag` to `"latest"` and rerun the publish flow without `--tag`.

## Questions or Issues

Open an issue in GitHub if anything here is unclear or you need maintainer help with a release. Thanks again for contributing!
