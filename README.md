# Model Sentry

**Source-backed change detection for the AI vendors your application depends on.**

Model Sentry is an open-source CLI and GitHub Action. It snapshots approved public vendor sources, detects meaningful text changes, classifies likely engineering impact, and produces a report with the configured and resolved source URL plus an evidence excerpt.

It is not a generic news scraper, an LLM agent, or an uptime monitor. Its job is to answer a smaller, operational question:

> A vendor changed something. Is there evidence that our team should review it?

## What v0.1 does

- Watches public changelog, API documentation, pricing, and SDK-release sources.
- Creates local, versioned source snapshots; the first run establishes a baseline rather than claiming a change.
- Uses stable paragraph-level diffs to reduce layout-only noise.
- Classifies potential model lifecycle, breaking API, pricing, rate-limit, and SDK-release changes.
- Writes machine-readable JSON and review-friendly Markdown reports.
- Runs as a self-hosted Node CLI or a GitHub Action with no telemetry or hosted-service dependency.

Every result remains a **review request**, not a claim that an integration is broken. Open the cited original source before acting.

## Quick start

Requires Node.js 20 or later.

```sh
# After the first npm release:
npx model-sentry packs
npx model-sentry init --providers openai,anthropic,google-gemini --project my-ai-app
npx model-sentry run --config model-sentry.json
```

The initial run saves a baseline under `.model-sentry/state`. Later runs create reports under `.model-sentry/reports`. `init` refuses to overwrite an existing config unless you explicitly pass `--force`. Until the npm package is published, use the local-development commands below.

For local development:

```sh
npm install
npm run check
npm test
npm run build
node dist/cli.js init --providers openai,anthropic,google-gemini
node dist/cli.js run --config model-sentry.json
```

## Configuration

Model Sentry intentionally uses JSON in v0.1 to keep the configuration parser dependency-free and auditable.

```json
{
  "version": 1,
  "project": "my-ai-application",
  "stateDir": ".model-sentry/state",
  "reportDir": ".model-sentry/reports",
  "sources": [
    {
      "id": "vendor-changelog",
      "provider": "vendor-name",
      "title": "Vendor release notes",
      "url": "https://vendor.example/changelog",
      "kind": "changelog"
    }
  ]
}
```

Supported `kind` values are `changelog`, `documentation`, `pricing`, and `sdk`.

Source URLs must be public HTTP(S) endpoints without credentials. Local, private, link-local, multicast, and other non-public IP literals are blocked by default; redirects are checked again. Requests time out after 20 seconds, and responses are capped at 2 MiB unless a lower `maxBytes` value is specified.

## GitHub Action

Commit the generated configuration, then add this workflow to the repository you want to monitor:

```yaml
name: Model Sentry

on:
  workflow_dispatch:
  schedule:
    - cron: "17 */6 * * *"

permissions:
  contents: read

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Restore Model Sentry state
        uses: actions/cache/restore@v4
        with:
          path: .model-sentry/state
          key: model-sentry-${{ runner.os }}-${{ github.ref_name }}-${{ github.run_id }}
          restore-keys: |
            model-sentry-${{ runner.os }}-${{ github.ref_name }}-
      - name: Detect source-backed changes
        uses: OWNER/model-sentry@v0.1.0
        with:
          config-path: model-sentry.json
          fail-on: high
      - name: Save Model Sentry state
        if: ${{ always() && hashFiles('.model-sentry/state/**') != '' }}
        uses: actions/cache/save@v4
        with:
          path: .model-sentry/state
          key: model-sentry-${{ runner.os }}-${{ github.ref_name }}-${{ github.run_id }}
```

Replace `OWNER` with the GitHub organization or account that publishes the Action. Pin to an immutable release tag in production. `fail-on` accepts `none`, `low`, `medium`, `high`, or `critical`. The Action adds the report to the GitHub step summary and exposes `status`, `report-path`, and `highest-severity` outputs.

The repository includes a local reusable workflow example at `.github/workflows/model-sentry.yml.example`.

## Starter provider packs

The first three packs point only to canonical official public changelogs:

- `openai`
- `anthropic`
- `google-gemini`

Packs are templates, not an endorsement or availability guarantee. Each pack declares the official host it has been reviewed against and a retention note; the test suite locks those fixtures down. Verify the current source URL, vendor terms, and your dependency scope before enabling it. Community source-pack pull requests should include the official source URL, a source-retention/terms note, and a synthetic fixture proving the intended rule classification.

## Privacy and data handling

Model Sentry makes no telemetry calls and does not upload source code, snapshots, configuration, or reports. Snapshot state stays in the configured local directory. Do not commit snapshots if the source terms do not permit retaining or redistributing normalized text; use a private CI cache or another approved state store instead.

## Why this project exists

AI application dependencies evolve unusually quickly: model IDs retire, pricing moves, SDKs change, API parameters disappear, and capacity policy shifts. A generic page diff is too noisy. Model Sentry adds a reviewable, evidence-first semantic layer while keeping the collection and state under the user’s control.

## Roadmap

- [ ] Add source-health checks for provider packs.
- [ ] Add GitHub Issue/PR annotation mode.
- [ ] Add structured model, SDK, and pricing extractors for approved provider packs.
- [ ] Add opt-in, privacy-preserving community rule-pack registry.

## Contributing

Start with a focused source pack, semantic rule, or fixture. Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a provider pack. Do not add browser automation, HTML scraping that violates a provider’s terms, source-code upload, or unreviewed claims of runtime impact.

## Security

Please follow [SECURITY.md](SECURITY.md) rather than opening a public issue for a potential security vulnerability. In particular, source-fetching and GitHub Action reports should include a minimal redacted reproduction and no credentials.

## License

[MIT](LICENSE)
