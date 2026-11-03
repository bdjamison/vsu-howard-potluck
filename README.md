# VSU Holiday Potluck v1.6 — email-based attendance deduplication

- No registration codes or new/returning selection.
- Email normalized to lowercase and trimmed; one attendee-group record per email.
- Additional dishes use the same email and do not increase attendance.
- Existing attendee details and guest counts are **not changed** by another public submission.
- All new dishes require Executive Board approval.
- Each person counts only once within a food category, even when bringing multiple dishes.
- Returning registrants should enter their original attendance count; the server ignores it for existing emails.

**Security limitation:** Email alone does not verify identity. Someone who knows another attendee's email could submit a pending food item under it. No private data is revealed and existing records cannot be edited by this path. The board should verify each item before approval. For stronger protection, add email one-time-code verification later.

**Existing v1.5 data:** Existing guest records remain usable; stored registration codes are ignored. Do not clear live records unless you intend to remove all signups.

Deploy files to the existing GitHub repo, retaining Azure settings. Test new registration, repeat registration with same email, and board approval. No production deployment was performed.
