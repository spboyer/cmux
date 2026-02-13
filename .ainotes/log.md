# AI Notes — Log

## 2026-02-13
- spec-tests: Invoke-SpecTests.ps1 param is `-SpecPath` not `-SpecFile`; supports `-DryRun`, `-TestName`, `-RerunFailed`, `-Model`, `-Target`
- spec-tests: Multi-target specs require `Given the <target> file` in assertions so the judge knows which file to evaluate
- spec-tests: Skill requires frontmatter `target:` field, prose intent between H3 and code fence, and fenced Given/When/Then assertion blocks — no `**Intent:**`/`**Verify:**` format
