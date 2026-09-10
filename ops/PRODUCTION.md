# Production release runbook

## Configure the deployment

Use one Linux host with Docker Compose, at least 4 GB available RAM, durable local storage and a managed HTTPS terminator (or a separately configured host reverse proxy). Decide the application domain and OIDC identity provider. Provision an authorization-code client with callback `https://YOUR_DOMAIN/api/auth/callback`; enable PKCE S256. Record permitted stable subject IDs, not email display names.

Copy `.env.example` to a private `.env`, replace every placeholder, and set restrictive filesystem permissions. Generate a random session secret of at least 32 characters; never commit or print it. Keep provider secrets in the host's secret manager and inject them into the deployment environment. Register the exact HTTPS public origin without a path. Session-secret rotation signs users out.

```sh
docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.production.yml up --build -d --wait
```

Route the TLS terminator to `127.0.0.1:8080`, preserve the public `Host`, and keep port 8000 private. Forward only trusted traffic to this loopback listener. Redirect HTTP to HTTPS and apply HSTS at the terminator after confirming the domain. Enforce request-rate limits at that boundary. Production refuses to start without complete OIDC configuration. Do not disable authentication to work around an identity configuration failure.

## Release gates

1. Require a green **Production gates** CI run on the exact revision being released. It runs numerical/unit/security tests, contract checks, dependency scans, build budgets, real container builds and browser/accessibility tests.
2. Build/tag both application images with that Git revision and retain the prior release images. Record the image digests, model version and database schema version (currently 1). Use those exact images for rollback; rebuilding an old tag against floating base images is not an identical rollback.
3. Make an online database backup and restore it into a separate file as described below. Keep the backup off the application disk with access controls appropriate to prospect data. The browser's local draft history is device-local convenience, not a backup.
4. Deploy privately, then test HTTPS sign-in with an allowed identity and denial with an unlisted identity. Confirm signed-out requests return 401, user A cannot see user B's portfolios, sign-out removes access, and foreign-origin writes fail. The automated suite covers application boundaries; provider registration and real TLS/cookies require this live check.
5. Confirm `/api/ready` returns 200 after worker startup. Create a small portfolio, save/run/reload/export, cancel a queued or running job, then restart the worker and repeat. Open allocation and prospect detail at desktop and phone widths. Confirm exported input hash matches the selected saved run.
6. Record those outcomes before opening user access. Configure alerts for failed readiness, repeated server errors, queue age, disk usage and backup age. Owner-scoped metrics are available after authentication; host-level monitoring must use trusted operational access.

The repository does not provision a cloud account, public domain, OIDC client, TLS certificate, monitoring destination or backup storage. Those are deployment inputs, and are not claimed complete by a passing local build.

## Backup and restore

The online backup utility uses SQLite's backup API, then checks database integrity and schema version. It never overwrites an existing destination.

```sh
# The backup directory in the data volume must be writable by UID 10001.
docker compose exec backend python scripts/backup.py /data/prospect-engine.sqlite3 /data/backups/RELEASE.sqlite3
# Copy the backup out to the host, then transfer to protected off-host storage.
docker compose cp backend:/data/backups/RELEASE.sqlite3 ./RELEASE.sqlite3
# Verify a restoration into a separate new database file.
docker compose exec backend python scripts/backup.py /data/backups/RELEASE.sqlite3 /data/restore-check.sqlite3
```

Use unique names for each backup and restore test. Unit tests verify restored rows/revisions and overwrite refusal. For a real recovery, stop API and worker writes, restore into a new volume/file, verify integrity and row counts, point `DATABASE_PATH` at that file in both services, and start the tested release. Keep the original volume intact until acceptance. Do not copy only a live SQLite main file; uncheckpointed WAL content can be lost.

Schedule backups through the deployment's existing scheduler and test recovery regularly. Choose an explicit recovery point and recovery time objective before onboarding users; the code cannot choose the acceptable data-loss window for the business.

## Rollback

Stop new job submissions at the trusted ingress. Let active jobs finish or cancel them, then stop the API and worker. For an application-only rollback with unchanged schema, start the retained prior image digests against a cloned copy of the current database and perform the smoke test before switching traffic. Model versions and input snapshots in existing runs remain immutable.

If a later release changes the schema incompatibly, use its tested reverse migration or restore the pre-release backup into a new volume. Restoring that backup loses writes after its timestamp; reconcile those writes before switching traffic. Never overwrite the only copy of the live database. Retain the failed release's volume for recovery and diagnosis.

## Dependency updates

The runtime lockfile targets Python 3.13 and is validated on Linux by CI. Resolve updates in a clean virtual environment, freeze runtime dependencies into `backend/requirements.lock`, scan with `pip-audit`, then repeat all gates. For the frontend update `package.json` and `package-lock.json` together, use `npm ci`, scan with `npm audit`, and repeat browser/build checks. Review base-image updates and pin release image digests in the deployment record.
