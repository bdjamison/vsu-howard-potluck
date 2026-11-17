# Multi-event Potluck — replacement package

This ZIP contains the full repository tree, not just changed files. It is built from the latest ZIP you uploaded and includes corrected multi-event admin.js, consistent category IDs in events.json, and KPL-specific public text.

## Safest way to apply
1. Keep your existing `main` branch unchanged.
2. On GitHub, switch to `multi-event`.
3. Replace the matching files in that branch, preserving paths. Do not create an extra top-level folder.
4. If uploading through GitHub web UI, upload the files within each folder (`public/`, `api/`) or use GitHub Desktop to copy the full tree and commit.
5. Confirm `PLATFORM_ADMIN_EMAIL` in Azure is your sign-in email; do not upload Azure secrets.
6. Validate in a preview environment before merging to `main`.

## Verification status
- Existing core unit tests and JavaScript syntax checks run during packaging.
- Real Azure Table Storage, identity authorization, and end-to-end signup/approval have NOT been tested.
- Existing VSU partitions are unchanged; KPL uses separate partitions.
- This package is NOT a production deployment or proof of production readiness.
