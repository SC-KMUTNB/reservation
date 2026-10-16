/**
 * Script to create and publish a new GitHub Release directly via GitHub CLI (`gh`).
 *
 * Usage:
 *   # Create release with command-line arguments:
 *   bun run release --tag=v1.9.1 --title="Bug Fix Title" --summary="Summary here" --category="fix" --desc="Fixed the bug"
 *
 *   # Or pass a notes file:
 *   bun run release --tag=v1.9.1 --title="Release Title" --notes-file=./notes.md
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  classifyVersion,
  formatUpdateToMarkdown,
  ChangeCategory,
  UpdateRecord,
} from '../src/lib/changelog';

const args = process.argv.slice(2);

function getArg(prefix: string): string | undefined {
  const match = args.find((a) => a.startsWith(`--${prefix}=`));
  return match ? match.slice(prefix.length + 3) : undefined;
}

const tag = getArg('tag');
const title = getArg('title');
const summary = getArg('summary') || '';
const category = (getArg('category') || 'improve') as ChangeCategory;
const desc = getArg('desc');
const notesFileArg = getArg('notes-file');
const isDryRun = args.includes('--dry-run');
const repo = getArg('repo') || process.env.GITHUB_REPO || 'SC-KMUTNB/reservation';

if (!tag || !title) {
  console.log(`
Usage:
  bun run release --tag=<vX.Y.Z> --title="<Release Title>" [options]

Options:
  --tag=vX.Y.Z          Version tag (e.g. v1.9.1)
  --title="Title"       Release title
  --summary="Text"      Release summary paragraph
  --category=feat|fix|improve|security
  --desc="Description"  Single change description
  --notes-file=path.md  Custom markdown release notes
  --dry-run             Preview release without publishing
  --repo=owner/repo     GitHub repository (default: SC-KMUTNB/reservation)
`);
  process.exit(1);
}

const versionType = classifyVersion(tag);
console.log('='.repeat(60));
console.log(`Publishing GitHub Release for ${repo}`);
console.log(`Tag:     ${tag} (${versionType.toUpperCase()})`);
console.log(`Title:   ${title}`);
console.log(`Mode:    ${isDryRun ? 'DRY RUN (Preview only)' : 'LIVE PUBLISH'}`);
console.log('='.repeat(60));

let releaseBody = '';

if (notesFileArg && fs.existsSync(notesFileArg)) {
  releaseBody = fs.readFileSync(notesFileArg, 'utf-8');
} else {
  const record: UpdateRecord = {
    version: tag,
    date: new Date().toISOString().slice(0, 10),
    type: versionType,
    title,
    summary,
    changes: desc ? [{ category, description: desc }] : [],
  };
  releaseBody = formatUpdateToMarkdown(record);
}

console.log(`\nRelease Notes Body:\n${releaseBody}\n`);

if (isDryRun) {
  console.log('Dry run complete. No release created.');
  process.exit(0);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-release-'));
const tempNotesFile = path.join(tempDir, `${tag}.md`);
fs.writeFileSync(tempNotesFile, releaseBody, 'utf-8');

try {
  const ghArgs = [
    'release',
    'create',
    tag,
    '--repo',
    repo,
    '--title',
    `${tag}: ${title}`,
    '--notes-file',
    tempNotesFile,
    '--target',
    'main',
  ];

  const ghProc = spawnSync('gh', ghArgs, { encoding: 'utf-8' });
  if (ghProc.status === 0) {
    const url = (ghProc.stdout || '').trim();
    console.log(`✅ Success! Release created: ${url}`);
  } else {
    console.error(`❌ Failed via gh: ${(ghProc.stderr || ghProc.stdout || '').trim()}`);
    process.exit(1);
  }
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
