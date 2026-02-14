# Quarterly Infrastructure Review

## Current State

We migrated three services to the new EKS cluster last quarter. The API gateway is handling 2.4M requests per day with p99 latency under 50ms. Database connection pooling reduced cold start times by 40%.

## Open Issues

The monitoring stack needs attention. Prometheus retention is set to 15 days but we need at least 30 for capacity planning. Alert fatigue from noisy PagerDuty rules is a recurring complaint in retros.

## Next Steps

Schedule a follow-up with the SRE team to review alerting thresholds. Consider migrating from self-hosted Prometheus to a managed solution.
