# Project workflow

- User preference (2026-11-15): after completing a coherent project change and passing the checks appropriate to it, create a Git commit and push it to the configured GitHub remote automatically. Do not wait for a separate commit/push request.
- Authorized destination: `origin`, `git@github.com:AcidAmy/X-ray-mirror-reproduction.git`. Use the current project branch unless the user specifies another branch.
- Commit task-related code, documentation, tests, and intended public assets. Exclude credentials, personal data, temporary files, and ignored build outputs. Do not include unrelated user edits.
- Use ordinary pushes; do not force-push or overwrite remote work. If checks or a push fail, report the failure accurately and resolve it where possible.
- Report the commit and push result. Automated checks do not replace the human camera acceptance steps in `ROADMAP.md`; leave those pending until the user confirms them.
