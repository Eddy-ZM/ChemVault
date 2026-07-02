# File Upload Security

Draft only. Needs security and legal review before commercial launch.

Last reviewed: July 2, 2026

## Implemented Baseline

ChemVault Files now has a centralized upload policy in `ChemVault-files/src/lib/chemvault-files/validation.ts`:

- maximum file size: 100 MB;
- allowed extensions include `pdf`, `png`, `jpg`, `jpeg`, `csv`, `txt`, `md`, `docx`, `xlsx`, `pptx`, `jdx`, `dx`, `h5`, `hdf5`, `json`, and `xml`;
- blocked extensions include `exe`, `dmg`, `app`, `sh`, `bat`, `cmd`, `js`, `mjs`, `cjs`, `html`, `php`, `py`, `jar`, and `zip`;
- server-side init rejects unsupported or oversized files;
- server-side upload rejects oversized payloads and rechecks registered metadata before R2 storage;
- upload UI warns users that scripts, executables, HTML, and ZIP archives are blocked;
- minimal in-memory rate limiting is applied to upload init and upload PUT routes.

## Remaining Required Work

- Add durable rate limiting with Cloudflare KV, D1, or Durable Objects.
- Verify stored R2 object size, checksum, and metadata after upload completion.
- Add malware scanning or quarantine before broad public upload access.
- Add archive scanning before allowing ZIP or other archives.
- Add audit logging for upload create, complete, reject, delete, preview, download, and share actions.
- Extend equivalent restrictions to ChemVault Extract document upload and any Apple-native upload surfaces.

## Risk Notes

The current baseline blocks common high-risk file types but does not prove files are safe. File scanning, content-type sniffing, object metadata verification, and retention rules still need security review.

Needs legal review: user content rules, takedown process, abuse reporting, retention exceptions, and treatment of sensitive research data.
