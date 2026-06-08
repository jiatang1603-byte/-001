# Security Specification: Jiatang Feedback Platform

## 1. Data Invariants
- A feedback record must have a unique, non-null `caseNumber` generated under the format `JT-YYYYMMDD-XXXX`.
- Users can create a feedback record anonymously via our custom-validated server proxy `/api/feedback` (which secures the collection against direct write spam, limits raw writes, and injects server-verified temporal data).
- Direct reads and updates to the `feedback` collection are strictly limited to authenticated administrative staff (roles: Administrative Clerk, Teaching Staff, and Quality Assurance).
- The `status` field is restricted to `pending`, `processing`, and `completed`. No other statuses are allowed.
- Field modifications directly from clients must block privilege adjustments (e.g. shadow updates or changing `assignedRole` illegally).

## 2. Threat Vector Payloads ("The Dirty Dozen")
The following unauthorized payloads must return `PERMISSION_DENIED` or be filtered on direct database connection attempts:
1. **Unauthenticated Read Request**: Attempt to download all client satisfaction profiles without signing in.
2. **Shadow Field Injection**: Attempt to push feedback items with additional unauthorized control flags (e.g. `isVerifiedAdmin: true` or `bypassAI: true`).
3. **Invalid ID Character Injection**: Attempt to create document ID containing hazardous script characters or paths.
4. **Temporal Spoofing**: Attempt to submit custom client-forged `createdAt` timestamps to falsify delivery logs.
5. **Admin Escape Hack**: Attempt to bypass security checks by sending a client claim containing custom roles directly in the token.
6. **Privilege Escalation**: Attempting to alter a completed ticket's owner or severity flags directly.
7. **Identity Theft Draft**: In authenticated updates, changing the `customerName` or client contact info.
8. **Invalid System Field Override**: Setting `aiSentiment` directly without server computation.
9. **Spam List Reads**: Issuing blind query lists without structural target conditions.
10. **Unbounded Size Denial-of-Service**: Trying to upload feedback with arrays hosting more than 100 items.
11. **Impersonating Staff**: Modifying `assignedRole` during user login.
12. **Premature Completion Update**: Skipping standard tracking flows via unvalidated direct modification.

---

## 3. Automated Security Rules Spec
We define the draft rules in `firestore.rules` with global validation parameters, standard catch-all gates, role configuration validations, and type constraints.
