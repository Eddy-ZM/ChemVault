# Permissions

| Resource/operation | Anonymous | Signed-in user | Suite service | Administrator | Stripe webhook |
| --- | --- | --- | --- | --- | --- |
| Public chemistry/site content | Read | Read | Read | Publish through repository | Deny |
| Read own plan/entitlements | Anonymous feature map | Verified identity only | With billing service secret and verified user ID | Admin plan through verified system role | Deny |
| Create checkout/open portal | Deny | Own verified billing identity | Deny | Own verified billing identity | Deny |
| Update subscription state | Deny | Deny | Deny | No direct override in public API | Fresh valid signature only |
| Submit form/lead/newsletter | Create bounded record | Create bounded record | Deny | Create/test | Deny |
| Read form/reply | Deny | Bounded ticket proof only | Deny | Explicit Forms/admin permission | Deny |
| Change form status/reply/export | Deny | Deny | Deny | Explicit permission plus audit | Deny |

D1 has no browser authority or row-level-security guarantee; Pages Functions enforce private access. A Stripe customer ID, subscription ID, Price ID, request body user ID, or client-side plan preview is never authorization. `BILLING_SERVICE_SECRET` authorizes the calling service, not the end user, so services must resolve user identity before making an internal entitlement request.
