# Redesign Status Index

## Layered execution standard (required)
- When rider or admin redesign scope reopens, run execution through [docs/18-layered-dev-checklist.md](./18-layered-dev-checklist.md) as the active board.
- Keep only one layer actively in progress at a time.
- Update tracker docs and linked source-of-truth docs in the same branch as code changes.
- Move shipped roadmap-facing work into `completed` phase in [apps/api/src/data/roadmap-features.ts](../apps/api/src/data/roadmap-features.ts).

## Reopen protocol
1. Pick the active layer for the redesign checkpoint.
2. Copy the "Layered reopen checklist" block from the target tracker and mark only one layer as active.
3. Ship implementation + docs + verification together, then mark the layer complete.
4. Record commit hashes and production verification status in the same tracker.

## Current status
- driver: [docs/driver-redesign-status.md](docs/driver-redesign-status.md)
- rider: [docs/rider-redesign-status.md](docs/rider-redesign-status.md)
- admin: [docs/admin-redesign-status.md](docs/admin-redesign-status.md)

## What is complete vs not complete
- driver scope: implementation for this round is complete, verified locally, pushed through `554d065`, with documentation checkpoints still local-only and production smoke confirmation still pending
- rider scope: tracker only; no dedicated rider redesign implementation chain has started yet
- admin scope: tracker only; no dedicated admin redesign implementation chain has started yet

## Notes
- [docs/driver-redesign-status.md](docs/driver-redesign-status.md) is the final handoff record for the completed driver round, but it includes local-only docs checkpoints that have not been pushed yet.
- [docs/rider-redesign-status.md](docs/rider-redesign-status.md) is an in-progress tracker, not a completed rider redesign record.
- [docs/admin-redesign-status.md](docs/admin-redesign-status.md) is an in-progress tracker, not a completed admin redesign record.
- Known local-only documentation commits at the time of this handoff:
  - `6f23302` — `docs(driver): add redesign status tracker`
  - `8cf8bc5` — `docs(status): add rider and admin redesign trackers`
- Latest pushed driver/application fix on `main`:
  - `554d065` — `fix(web): stop empty-json offer actions`