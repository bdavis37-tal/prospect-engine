# Architecture

```text
Browser -- HTTPS --> trusted TLS terminator -- loopback --> nginx :8080
                                                           | /api
                                                           v
                                                     FastAPI :8000
                                                           |
                                              SQLite WAL on local volume
                                                           |
                                                   bounded queue worker
                                                           |
                                              isolated analysis subprocess
```

Nginx serves immutable build assets and proxies the API under the same origin. Only nginx is published, on loopback; the production host supplies TLS. FastAPI validates inputs, authenticates requests, enforces owner-scoped access, versions portfolios, queues jobs, and returns saved results. It does not perform simulation in request handlers.

Each portfolio has an owner and an optimistic revision. Jobs contain the exact validated input, SHA-256 canonical input hash and model version at submission; results never depend on subsequent edits. Submission keys are unique per owner, allowing safe retries. The browser keeps the same key after an uncertain submission response. Queue claims use a SQLite immediate transaction. The worker spawns an isolated process, reports progress, honors cancellation, enforces execution deadlines and marks abandoned runs interrupted.

`/api/health` checks process liveness. `/api/ready` checks the database and a recent worker heartbeat. `/api/metrics` returns owner-scoped job counts; it is not a public administrative dashboard. Request logs include IDs, route, status and duration, without prospect payloads or tokens. Audit rows record save/run/cancel actions.

Production OIDC uses discovery and Authlib's authorization-code flow with PKCE, token validation, state and nonce. A signed, HTTP-only, Secure, SameSite=Lax session contains an issuer/subject owner key and display name. Subject access is allowlisted. Mutations require an application request header and reject foreign origins. OIDC credentials and session secrets are runtime configuration. The frontend never receives access/refresh tokens.

SQLite is the deliberate single-host persistence choice. Keep the volume on a local durable disk, run one API service and a bounded worker count, and back it up online. Do not share it over NFS or scale this Compose stack across hosts. Move to a managed relational database and external queue before requiring multi-host availability. Workload/queue quotas bound execution; historical job limits bound individual workspaces. Operators must monitor disk capacity and establish retention for the number of authorized users.

The frontend's canonical types are generated from Pydantic schemas. Samples lazy-load complete analysis snapshots; 3D and scene geometry load only when requested. The active interface is `src/workbench`, with `components/three` retained solely for sample illustrations. The former demo-only interface and placeholder wizard have been removed.
