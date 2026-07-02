# AI Data Handling

Draft only. Needs legal, security, and scientific review before commercial launch.

Last reviewed: July 2, 2026

## Implemented User Notices

AI data handling notices were added to:

- the main ChemVault AI Paper Search public page;
- ChemVault Extract single-document upload;
- ChemVault Extract batch upload;
- ChemVault Extract document AI extraction action panel.

The notice tells users that AI features may process submitted text, files, or extracted content through third-party AI services, and that they should not submit sensitive personal information, confidential data, or content they do not have permission to process.

## Data Types

AI workflows may process:

- uploaded scientific papers and files;
- extracted text and document chunks;
- prompts, instructions, and metadata;
- model outputs, structured extraction records, and review items;
- cost estimates and usage records;
- errors, job status, and provider response metadata.

## Required Controls

- Keep Privacy Policy and Terms aligned with actual AI provider processing.
- Avoid logging full prompts, full source content, or full AI outputs unless necessary and access-controlled.
- Provide deletion/export coverage for AI inputs and outputs.
- Preserve human-review disclaimers on extraction and review screens.
- Do not present AI outputs as definitive scientific, medical, regulatory, or safety decisions.
- Confirm OpenAI/provider data processing terms and account data controls before production use.

## Remaining Work

- Add durable per-user AI rate limits for non-v1 web routes where needed.
- Add retention configuration for AI inputs/outputs and intermediate chunks.
- Add tests or QA checks for notice placement.
- Confirm whether user-provided OpenAI keys are stored encrypted and can be deleted/exported.

Needs legal review: AI provider disclosures, retention, user content rights, scientific liability disclaimers, and regulated-use restrictions.
