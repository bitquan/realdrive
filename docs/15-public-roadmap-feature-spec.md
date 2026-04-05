# Feature #26: Public Roadmap Page in App

## Overview

Add a public-facing "Roadmap" or "What's Coming" page accessible to all users (riders, drivers, admins) that displays:
- Planned features organized by phase (Now / Next / Later)
- What users are asking for
- Feature voting/upvoting mechanism
- Status transparency

## User Value

- **Riders**: See what improvements are coming, feel heard if their request is on the roadmap
- **Drivers**: Know when key operational features arrive (earnings improvements, better offers UX, etc.)
- **Admins**: Communicate product direction internally and externally
- **Product**: Gather demand signals through upvoting, reduce duplicate feature requests

## Feature Requirements

### Phase B: MVP (Next Wave)

1. **Read-only Roadmap View**
   - Display Phase A (Now) features - current work
   - Display Phase B (Next) features - upcoming priorities
   - Do NOT show Phase C (Later) or Deferred items publicly
   - Include feature title, description, target phase, and estimated impact

2. **Upvoting Mechanism**
   - Each user can upvote features (1 vote per user per feature)
   - Vote count displayed next to each item
   - Users see if they've already upvoted a feature
   - Upvotes persist to database

3. **Request Submission** (Optional for MVP)
   - Users can optionally submit requests for features not on the roadmap
   - Creates audit trail for product team
   - Could send to Slack/Discord webhook for triage

4. **Visibility**
   - New tab/route: `/roadmap` or bottom nav item "Roadmap"
   - Accessible to all roles (public for riders/drivers, enhanced for admins if needed)
   - Mobile-friendly layout

### Phase C: Enhancements (Later)

- Comment threads on features
- Feature search/filter by category
- Timeline view showing estimated shipping dates
- Integration with feature request tools (Canny, ProductBoard)
- Admin dashboard to manage phases and visibility

## Technical Spec

### Database Schema (New Tables)

```sql
-- Feature votes/upvotes
CREATE TABLE feature_vote (
  id UUID PRIMARY KEY,
  featureId VARCHAR(50) NOT NULL,  -- e.g., "feature_26", matches roadmap table
  userId UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  votedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(featureId, userId)  -- One vote per user per feature
);

-- Optional: Feature requests from users
CREATE TABLE feature_request (
  id UUID PRIMARY KEY,
  requesterId UUID NOT NULL REFERENCES "user"(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),  -- e.g., "rider", "driver", "admin", "other"
  status VARCHAR(20) DEFAULT 'submitted',  -- submitted, reviewed, merged, rejected
  votes INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints (New)

```
GET /me/roadmap
  => Lists features with user's vote status
  Response: { features: [{ id, title, phase, category, voteCount, userVoted }], totalVotes }

POST /me/roadmap/vote/:featureId
  => Create/remove vote for a feature
  Request: { vote: true|false }
  Response: { voteCount, userVoted }

POST /me/feature-requests (optional)
  => Submit a new feature request
  Request: { title, description, category }
  Response: { id, status, createdAt }

GET /me/feature-requests (optional)
  => List own submitted requests
```

### Frontend Components

**Route**: `/roadmap` or new tab in shell navigation

**Components**:
- `RoadmapPage` - main container
  - `RoadmapPhaseSection` - one section per phase (Now/Next/Later)
    - `RoadmapFeatureCard` - individual feature with upvote button
    - `RoadmapVoteButton` - toggle upvote (shows count and filled/outline state)
  - `FeatureRequestForm` (optional) - submit new ideas
  - `EmptyState` - if no features in a phase

### Roadmap Data Source

Initially, read from static config/database query that mirrors `13-roadmap-baseline-25-features.md`:

```typescript
// apps/api/src/data/roadmap-features.ts
export const ROADMAP_FEATURES = [
  {
    id: "feature_1",
    title: "Rider booking form UX refresh",
    description: "Faster booking with clearer input states and validation",
    category: "rider",
    area: "UI/Rider",
    phase: "now",     // Phase A
    impact: "high"
  },
  // ... 25 more features
];
```

Eventually: Move this to database/CMS for easier updates without code changes.

## Acceptance Criteria

- [ ] Users can view Phase A and Phase B features
- [ ] Users can upvote/unvote features (persists to database)
- [ ] Vote counts are accurate and real-time
- [ ] Page is accessible at `/roadmap` and linked in nav
- [ ] Mobile layout is responsive and clear
- [ ] Only authenticated users can vote
- [ ] Feature card shows: title, description, phase, vote count, user's vote status
- [ ] No deferred or later features are publicly visible
- [ ] Admin users see vote analytics (optional for MVP)

## Design Notes

- Use same card style as notification/ride cards for consistency
- Upvote button: outline → filled on click, show count
- Phase headers: "Now (Active Work)", "Next (Planned)", "Later (Under Consideration)"
- Empty state: "Check back soon for more planned features"
- Sort within phase by: vote count desc, then by feature ID (insertion order)

## Dependencies

- Feature #5 (Global toasts) - for vote feedback
- Feature #19+ (Analytics panel) - for admin vote dashboards (Phase C)

## Owner / Estimate

- Owner: [`TBD`]
- Estimate: 2–3 weeks (MVP) / 4–5 weeks (with requests feature)
- Frontend: ~1 week
- Backend: ~1 week
- Design/validation: ~3–5 days

## Rollout Plan

1. **Internal alpha**: Enable for admin users only for 1 week, gather feedback
2. **Beta**: Roll out to 10% of riders/drivers, monitor engagement
3. **Full launch**: Announce in release notes, feature discovery prominent in nav

## Known Risks

- Users submit feature requests faster than product can categorize them (need triage workflow)
- Upvoting popularity doesn't always align with product value (educate users on how we use votes)
- Privacy: voting data could reveal internal roadmap priorities if not handled carefully

## Related Issues

- Roadmap feature issue: `[TBD - link to GitHub issue]`
- Implementation board: [14-roadmap-implementation-board.md](./14-roadmap-implementation-board.md)
