# Games module

A small catalog of reward-earning games. Playing a game creates a session,
optionally charges an entry cost in reward points, and awards reward points scaled
by the submitted score.

## Responsibilities

- **Catalog** — list active games (`games`).
- **Start** — create a `STARTED` session. If the game has an `entryCost`, spend
  those reward points through the Rewards ledger, in **one transaction** with the
  session insert and audit.
- **Submit score** — lock the session, record the score (append-only), compute the
  reward (`minReward + (maxReward − minReward) × score / maxScore`, clamped),
  award the points through the Rewards ledger, record the reward, mark the session
  `COMPLETED` — all in **one transaction**.
- **History** — a member's own play history (game, status, score, points awarded).

## Architecture

Follows the platform DNA: **Database → Repository → Service → Controller → Route**.
Entry and reward points are **not re-implemented** — the service composes the
Rewards module's transaction-aware seam (`spendPointsWithin` / `awardPointsWithin`)
so the ledger, projection and reward audit remain the single source of truth.

```
schema/games.ts          games, game_sessions, game_scores, game_rewards
repositories/            GameRepository, SessionRepository (row-lock, history),
                         GameAuditRepository
services/game.service    transactional start / submit-score, history
controllers/             HTTP boundary (member self-service)
routes/game.routes       /api/v1/games/* (auth-only)
```

## Endpoints

| Method | Path | Guard |
| --- | --- | --- |
| GET | `/api/v1/games` | auth |
| POST | `/api/v1/games/:id/start` | auth |
| POST | `/api/v1/games/sessions/:id/score` | auth |
| GET | `/api/v1/games/me/history` | auth |

Permissions `game.read` / `game.manage` are reserved in the RBAC catalog for future
administrative management; the player-facing endpoints require authentication only.

## Tests

`tests/games.integration.test.ts` (PGlite) covers: listing only active games,
starting a session (entry charged through the ledger, balance updated), submitting a
score (reward scaled by score, balance updated), rejecting a double submission,
rejecting a start with insufficient points (no session created), and history.
