# Backup & Recovery — Super Dreams Platform

PostgreSQL is the system of record. Redis is a cache and the in-process settings
cache is derived state — **neither requires backup**. Back up PostgreSQL.

## What to back up

- **PostgreSQL** — all business data, ledgers, audit log, configuration.
- **Secrets** — `.env.production` / secret manager entries (store securely and
  separately; never in the repo).
- **Object storage** — none in v1.0.0 (documents store metadata only; exports
  are generated on demand).

## Provided scripts

`infrastructure/scripts/backup.sh` and `infrastructure/scripts/restore.sh` wrap
`pg_dump`/`psql` against the Compose `postgres` service.

### Create a backup

```bash
ENV_FILE=.env.production ./infrastructure/scripts/backup.sh
```

- Writes a gzipped dump to `infrastructure/backups/superdreams-<timestamp>.sql.gz`.
- Retains the **10 most recent** backups (older ones are pruned).

### Restore a backup

```bash
ENV_FILE=.env.production ./infrastructure/scripts/restore.sh \
  infrastructure/backups/superdreams-<timestamp>.sql.gz
```

Restoring replays the dump into the configured database. Restore into a fresh /
empty database to avoid conflicts, then run `db:migrate` to confirm the schema
is current.

## Recommended production schedule

| Aspect            | Recommendation                                              |
| ----------------- | ----------------------------------------------------------- |
| Frequency         | Nightly full dump; consider WAL archiving / PITR for RPO<24h|
| Retention         | 30 days rolling (adjust to compliance needs)                |
| Off-site copy     | Replicate dumps to durable object storage in another region |
| Encryption        | Encrypt backups at rest and in transit                      |
| Restore drills    | Test a full restore at least quarterly                      |

> The bundled script keeps 10 local dumps — suitable for development. For
> production, use a managed backup solution or extend the script to push to
> off-site, encrypted storage and to run on a schedule.

## Recovery objectives (targets to agree with stakeholders)

- **RPO** (data loss tolerance): ≤ 24h with nightly dumps; ≤ minutes with PITR.
- **RTO** (time to restore): dominated by dump size + migration run; validate
  during restore drills.

## Disaster recovery outline

1. Provision fresh PostgreSQL + Redis.
2. Restore the latest verified dump (`restore.sh`).
3. Run `pnpm --filter @superdreams/api db:migrate`.
4. Deploy the API + SPAs; point them at the restored database.
5. Verify `/ready`, then run the post-deploy checks in the deployment guide.
