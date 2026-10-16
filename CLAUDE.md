# Claude Code / Agent Instructions

Please follow the authoritative guide in:

👉 **[docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md)**

### Quick Reference
- **Runtime:** Bun (`bun run dev`, `bun test`, `bun run build`)
- **Typecheck:** `bun run typecheck`
- **Lint:** `bun run lint`
- **Publish Release:** `bun run release --tag=<vX.Y.Z> --title="..." [options]` or `gh release create`
- **Changelog:** Powered 100% dynamically via GitHub Releases (no local `updates.json`).
