# Contributing to Model Sentry

Thank you for helping make vendor change detection more reviewable and useful.

## Development

Use Node.js 20 or later, then run:

```sh
npm ci
npm run check
npm test
npm run pack:check
```

Keep changes focused, add a regression test for behavior changes, and do not include generated state under `.model-sentry/`.

## Provider packs

Provider packs must use an official, public HTTPS source. They must be narrow enough to produce a useful operational signal, rather than a broad marketing or general-news page. Every pack declares its reviewed official hosts and a short retention note; the test suite verifies those fixtures.

Before opening a pack pull request, verify the provider's current terms and that local retention of normalized text is acceptable for the intended user. Do not add browser automation, access-controlled pages, copied source documents, or material that cannot be redistributed in this repository. Use small synthetic fixtures to test classification behavior when a real excerpt would be inappropriate to commit.

## Design principles

- Preserve original-source URLs and evidence excerpts in reports.
- Treat classifications as review requests, never as assertions of production impact.
- Keep state local and keep telemetry out of the project.
- Prefer small, auditable code over opaque automation.
