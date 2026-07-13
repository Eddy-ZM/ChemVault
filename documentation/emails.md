# Email Delivery

| Mail | Trigger/recipients | Inputs | Failure behavior |
| --- | --- | --- | --- |
| Lead/form admin notice | Accepted intake → configured private recipients | Escaped bounded summary and private admin URL | D1 record remains; mail status/error recorded |
| User confirmation | Accepted lead/newsletter/form where enabled | Escaped name/ticket/status and public links | Intake remains valid; retry/manual follow-up possible |

Provider keys stay server-side. Recipient lists and from addresses are deployment config; untrusted HTML is escaped and secrets/form bodies are excluded from logs.
