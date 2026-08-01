# Monitoring (infrastructure)

Scaffolding for the future observability stack. **No dashboards are configured
in this phase**, and no application code is added here.

## Planned stack

| Tool       | Purpose                          | Status                      |
| ---------- | -------------------------------- | --------------------------- |
| Prometheus | Metrics scraping                 | config scaffolded           |
| Grafana    | Dashboards                       | deferred (no dashboards yet)|
| Loki       | Log aggregation                  | deferred                    |

## Health & metrics endpoints

- **Health (available now):** the API exposes `GET /health`, `GET /ready`,
  `GET /live`; the frontends expose `GET /healthz`.
- **Metrics (deferred):** `infrastructure/monitoring/prometheus/prometheus.yml`
  targets `api:3000/metrics`. A `/metrics` endpoint is **not** added in this
  phase (it is application code); wire it up when observability is provisioned.

## Enabling later

Add a `monitoring` profile/compose file that runs Prometheus (mounting
`prometheus/prometheus.yml`), Grafana, and Loki, on the `superdreams` network.
