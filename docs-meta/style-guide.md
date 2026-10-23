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
5. **Troubleshoot:** common failures and their fixes.
6. **Next steps:** two or three links.

## Writing rules

- Use the imperative and second person: "Run…", "you".
- Write short sentences, one idea each.
- Make link text describe the target. Never "click here".
- No section numbers in headings, and no boilerplate intros.
- Commands must be copy-pasteable. Write placeholders as `<PLACEHOLDER>` and define each one right after the block.
- Pin versions, and show real expected output.
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
