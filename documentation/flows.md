# Critical Flows

| Flow | Actor/precondition | Protected sequence/side effects | Failure/deny |
| --- | --- | --- | --- |
| Public search/read | Anyone | Load generated public-only index and record page | Private/admin fields never enter index |
| Form/lead/newsletter submit | Public user with valid bounded input/anti-abuse | Validate, minimize/hash network data, reuse an existing record for a valid repeated `Idempotency-Key`, otherwise atomically write D1 and issue a ticket; queue/send confirmations/admin notice | Invalid/rate-limited request denied; concurrent duplicate keys converge on the original ticket; mail failure does not erase stored intake |
| Ticket lookup | Reporter with ticket proof | Return bounded submission/reply state | Unknown ticket returns no private record |
| Admin triage/export/reply | Verified administrator | Resolve permission, read/update/export D1, write audit, optionally notify | UI/claimed email alone is insufficient; non-admin denied |
| Retention purge | Scheduled service secret | Delete expired form records/attachments according to policy, report counts | Missing secret fails; bounded/idempotent run |
