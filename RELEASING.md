# Releasing Model Sentry

This project creates GitHub releases from immutable version tags. The release workflow deliberately does not publish to npm; publishing a package requires separate maintainer credentials and a package-name decision.

## Before the first release

1. Create the public GitHub repository and set its canonical URL in the README and package metadata.
2. Enable private vulnerability reporting, branch protection, and required `Verify` checks.
3. Confirm that the committed `dist/` directory matches `npm run build`; GitHub Actions execute the bundled action from that directory.
4. Run `npm ci`, `npm run check`, `npm test`, and `npm run pack:check` on a clean checkout.
5. Review each starter-pack URL and its provider terms. Do not publish retained snapshots or reports.

## Create a release

1. Set the version in `package.json` and `package-lock.json`.
2. Update `README.md` when a user-visible behavior or support policy changed.
3. Merge the release commit to `main`.
4. Create and push an annotated tag matching the package version, for example `v0.1.0`.
5. The `Release` workflow verifies the tag, checks the package, and creates the GitHub release with generated notes.

For a moving major Action tag such as `v0`, maintain it only after the immutable version tag and GitHub release succeed. Consumers who need reproducibility should use an immutable release tag such as `v0.1.0`.
