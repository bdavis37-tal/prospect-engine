# Production audit status

The original demo-only interface has been replaced with a unified workbench and durable analysis workflow. The implementation and verification ledger is [IMPLEMENTATION.md](IMPLEMENTATION.md). Operational requirements and deployment checks are in [ops/PRODUCTION.md](ops/PRODUCTION.md).

The code now enforces previously ignored constraints, reports infeasibility/timeouts, calculates the selected portfolio's actual simulated outcomes, uses matched alternative draws and independent prospect uncertainty, generates shared API types, authenticates production requests, persists bounded jobs, and serves a compiled static frontend through a same-origin proxy.

Production use still depends on validated asset assumptions, the selected deployment environment, configured OIDC/HTTPS, monitoring and a tested off-host backup policy. A passing application test does not establish those external controls or validate geological inputs.
