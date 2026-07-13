# Permissions

| Resource/operation | Public | Ticket holder | Administrator | Retention service |
| --- | --- | --- | --- | --- |
| Public chemistry/site content | Read | Read | Publish through repository | Deny |
| Submit form/lead/newsletter | Create bounded record | Create | Create/test | Deny |
| Read form/reply | Deny | Bounded ticket lookup | Explicit Forms/admin permission | Purge only |
| Change status/reply/export | Deny | Deny | Explicit permission and audit | Deny |
| Purge expired records | Deny | Deny | Manual audited action | Dedicated secret |

D1 has no browser authority or RLS guarantee; Pages Functions enforce all private access. Idempotency keys select only the already-created response for that exact submission path and do not grant ticket/admin read access. Public index generation uses an explicit public projection.
