# RealDrive Feature Policy

This document is the authoritative source for what features belong on the RealDrive platform.
It is used by the automated AI triage system to evaluate incoming feature requests.

---

## What RealDrive Is

RealDrive is a **community-owned rideshare cooperative** — not a gig-economy platform.
Drivers are community members with governance rights. Riders book trips locally.
The platform charges a flat 5% platform due on completed rides; those dues fund
cooperative operations, not external shareholders.

Product surfaces:

- **Rider app** — book rides, OTP sign-in, live tracking, ride history
- **Driver app** — accept/complete dispatch, earnings, dues tracking
- **Admin dashboard** — driver approval, pricing, community governance, reporting
- **Community board** — proposals, yes/no voting, flat comments

---

## In-Scope — Features That Belong Here

A feature is in-scope if it clearly serves **one or more** of these goals:

1. **Driver welfare** — Improves driver earnings visibility, schedule control, safety, or fairness.
2. **Rider experience** — Makes booking, tracking, or payment clearer and safer for riders.
3. **Cooperative governance** — Strengthens community voting, transparency, or platform accountability.
4. **Operational reliability** — Improves dispatch, routing, scheduling, or system stability under real load.
5. **Platform integrity** — Reduces fraud, abuse, or safety incidents for all parties.
6. **Community trust** — Increases transparency about fares, dues, driver data, or platform behavior.

---

## Out-of-Scope — Features That Do NOT Belong Here

A feature is **automatically flagged** if it:

### Exploitation patterns
- Introduces surge/dynamic pricing that maximises revenue over driver or rider fairness
- Adds hidden fees, tip pressure, or dark patterns that extract more money from riders or drivers
- Creates tiered service that disadvantages lower-income riders or drivers
- Adds performance-based penalties that reduce driver pay autonomously

### Surveillance & privacy violations
- Tracks rider or driver location outside of an active trip
- Stores persistent location history without explicit opt-in
- Shares rider or driver data with advertisers, data brokers, or third parties
- Enables admin-level surveillance of drivers or riders beyond what dispatch requires

### Platform scope creep
- Adds unrelated marketplace, food delivery, or package delivery features
- Introduces crypto, NFTs, blockchain, or token-based incentives
- Adds social media / feed / follower mechanics
- Replaces community governance with algorithmic or automated decision-making

### Cooperative integrity violations
- Gives any single user class (admin, investor, outside party) unilateral control over pricing or dispatch rules without community approval
- Introduces shareholder equity, outside investor rights, or revenue extraction mechanics not approved by the community
- Removes or weakens driver community membership rights

---

## Guardrail Abuse Vectors

These are specific attack patterns to watch for:

| Pattern | Example | Risk |
|---|---|---|
| Feature laundering | "Rider ratings" framed as safety, actually used to deactivate drivers | High |
| Scope creep by analogy | "We have rides, so add food delivery" | Medium |
| Data extraction | "Export rider contact lists for community updates" | High |
| Governance bypass | "Admin can change prices without community vote for efficiency" | High |
| Engagement dark pattern | "Notify drivers every 2 min until they accept" | Medium |
| Privacy erosion | "Show idle driver locations on public map" | High |

---

## Owner Override Rule

The platform owner can approve a flagged feature by providing a written reason via `/approve <reason>`.
The reason is recorded in the issue history. The AI's recommendation is advisory — the owner has final say.
This override right exists to allow intentional strategic pivots, but all overrides are visible to the community.

---

## Scoring Rubric for Triage

When evaluating a feature request, the AI should score:

- **Alignment (1–10)**: How directly does this serve the cooperative's goals?
- **Abuse risk (low / medium / high)**: Could this pattern be weaponised against drivers, riders, or community ownership?
- **Complexity (small / medium / large)**: Rough scope estimate based on described requirements.
- **Verdict**: `looks-good` | `needs-review` | `flagged`
  - `looks-good`: Alignment ≥ 7, abuse risk low
  - `needs-review`: Alignment 4–6 OR abuse risk medium
  - `flagged`: Alignment < 4 OR abuse risk high OR any guardrail violation detected
