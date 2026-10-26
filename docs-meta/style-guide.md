# Style guide

## Page types

Set `doc_type` in front matter to one of:

| Type | For | Answers |
|---|---|---|
| `concept` | Understanding | What is it, and why does it matter? |
| `how-to` | One task | How do I do X? |
| `tutorial` | Learning by doing, end to end | Walk me through it. |
| `reference` | Lookup | APIs, CLI, config options, limits. |

## How-to template

1. **Overview:** one or two sentences on what this does and when to use it.
2. **Before you begin:** access, versions, and anything installed first.
3. **Steps:** numbered, one action per step.
4. **Verify:** how to tell it worked, with the real expected output.
5. **Next steps:** two or three links.

No troubleshooting sections in how-tos.

## Writing rules

- Use the imperative and second person: "Run…", "you".
- Write short sentences, one idea each.
- No colons, semicolons or dashes (em dash, en dash, or a spaced hyphen) in doc prose, titles, captions or diagram text. Use a full stop or a comma, or rephrase. Lists of fields go in a table. Hyphens inside words (open-source), code, URLs and labels quoted exactly from a product UI are fine.
- Name parties by who they are to each other: "the model vendor" and "the vendor's customer", or "your organization". Not "enterprise" or a bare "customer".
- Call what the model runs on "the infrastructure", and each machine in it a "host". Not "GPU nodes" or "servers". CCM's own term for an enrolled host is a compute node.
- Spell it "enroll" (enrolls, enrolled, enrollment), not "enrol".
- Make link text describe the target. Never "click here".
- No section numbers in headings, and no boilerplate intros.
- Commands must be copy-pasteable. Write placeholders as `<PLACEHOLDER>` and define each one right after the block.
- Never write a version out: use the versions data (`{{component.version}}` in code, `<Version of="…" />` in text; see `versions/README.md`). Show real expected output.
- Put platform differences (SGX, TDX, SEV-SNP, Nitro, OS) in tabs or admonitions, not in separate near-identical pages.
- Every screenshot has alt text. Prefer text over a screenshot when either works.
- Security pages state their trust assumptions: what is trusted, and by whom.
- Never invent facts. If unsure, write `<!-- TODO(verify): reason -->`.

## Write for translation

- One term per concept. Use the glossary term every time.
- No idioms, jokes, or culture-specific references.
- Don't build sentences around UI strings. Write the UI label in **bold**, exactly as shown.
- Avoid text inside images. If an image needs labels, use a diagram whose source can be translated.

## Review checklist

- [ ] `doc_type` set, and the page follows its template
- [ ] Commands run as written; output is real
- [ ] Placeholders defined
- [ ] Links work and describe their target
- [ ] No invented facts; remaining TODO(verify) comments listed in the PR
- [ ] Builds in light and dark; images have alt text
