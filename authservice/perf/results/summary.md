# k6 run summary
Generated: 2025-11-06T21:43:06.1896471+05:30

- Total http_reqs metrics lines: 617
- http_req_failed (value=1) occurrences: 616

## http_reqs by tag
- http_reqs { expected="true" } : 539
- http_reqs { expected="false" } : 77

## http_req_failed by tag (value=1 counts)
- http_req_failed { expected="true" } : 560
- http_req_failed { expected="false" } : 85

Adjusted http_req_failed (excluding expected=true requests): 100%

Note: k6's raw "http_req_failed" counts any HTTP status >=400 as a failed request. This summary computes an adjusted failure rate that excludes requests tagged with expected="true" (i.e. endpoints where 4xx are accepted for headless testing). Provide a proper access token to reduce expected 4xx responses and lower the raw http_req_failed number.

## Checks (counts)
- audit-log ok : 77
- sync status 200/201/401/403 : 77
- me status 200/401/403 : 77
- admin roles ok : 77
- patch profile ok : 77
- verify authenticated true : 77
- mfa toggle ok : 77
- health status 200 : 77
- verify status 200/401/403 : 77

Raw file: .\results\result.json
