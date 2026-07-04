# Monitoring

Pacta currently emits structured JSON logs through `nestjs-pino`, redacts cookies and authorization headers, and returns `x-request-id` on API responses.

Environment switches:

- `LOG_LEVEL` controls API log verbosity.
- `SENTRY_DSN` is reserved for frontend/backend error reporting.
- `OTEL_EXPORTER_OTLP_ENDPOINT` is reserved for OpenTelemetry trace export.

Production deployment should attach logs to the selected backend host, then wire OpenTelemetry and Sentry after the hosting provider is approved.
