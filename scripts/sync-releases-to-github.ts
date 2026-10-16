/**
 * Script to sync updates from src/data/updates.json to GitHub Releases.
 *
 * Supports BOTH:
 *   1. GitHub CLI (`gh release create`) - Recommended (no token needed if logged in via `gh auth login`)
 *   2. GitHub REST API (using GITHUB_TOKEN)
 *
 * Usage:
 *   # Preview what would be created without making changes:
 *   bun run releases:preview
 *
 *   # Sync with GitHub CLI (gh):
 *   bun run releases:sync
 *
 *   # Sync with GITHUB_TOKEN:
 *   GITHUB_TOKEN=ghp_xxx bun run releases:sync
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import updatesData from '../src/data/updates.json';
import {
  UpdateRecord,
  formatUpdateToMarkdown,
  classifyVersion,
} from '../src/lib/changelog';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const forceApi = args.includes('--api');

const tokenArg = args.find((a) => a.startsWith('--token='));
const repoArg = args.find((a) => a.startsWith('--repo='));

const token = tokenArg ? tokenArg.split('=')[1] : process.env.GITHUB_TOKEN;
const repo = repoArg
  ? repoArg.split('=')[1]
  : process.env.GITHUB_REPO || 'SC-KMUTNB/reservation';

function checkGhCli(): { available: boolean; loggedIn: boolean; error?: string } {
  try {
    const versionRes = spawnSync('gh', ['--version'], { encoding: 'utf-8' });
    if (versionRes.status !== 0) {
      return { available: false, loggedIn: false };
    }

    const authRes = spawnSync('gh', ['auth', 'status'], { encoding: 'utf-8' });
    const isLogged =
      authRes.status === 0 ||
      Boolean(authRes.stderr && authRes.stderr.includes('Logged in to github.com'));

    return { available: true, loggedIn: isLogged };
  } catch {
    return { available: false, loggedIn: false };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log(`GitHub Releases Sync Tool for ${repo}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (Preview only)' : 'LIVE SYNC'}`);
  console.log('='.repeat(60));

  const updates: UpdateRecord[] = (updatesData as any[]).map((u) => ({
    ...u,
    type: classifyVersion(u.version),
  }));

  console.log(`Found ${updates.length} releases in updates.json.\n`);

  const ghStatus = checkGhCli();
  const useGhCli = !forceApi && ghStatus.available && ghStatus.loggedIn;

  if (!isDryRun) {
    if (useGhCli) {
      console.log('✨ Using GitHub CLI (gh) for publishing releases.\n');
    } else if (token) {
      console.log('🔑 Using GitHub REST API with GITHUB_TOKEN.\n');
    } else {
      console.error('❌ Error: Neither GitHub CLI nor GITHUB_TOKEN is available!\n');
      if (ghStatus.available && !ghStatus.loggedIn) {
        console.error('👉 You have GitHub CLI installed, but you are not logged in:');
        console.error('   Run: gh auth login\n');
      } else {
        console.error('👉 Option 1 (Recommended): Install GitHub CLI (gh):');
        console.error('   Run: winget install --id GitHub.cli');
        console.error('   Then: gh auth login');
        console.error('   And re-run: bun run releases:sync\n');
        console.error('👉 Option 2: Provide a GitHub Personal Access Token:');
        console.error('   $env:GITHUB_TOKEN="ghp_xxx"');
        console.error('   bun run releases:sync\n');
      }
      process.exit(1);
    }
  }

  // Iterate in reverse order (v1.0.0 first up to latest v1.8.0) so release order on GitHub is chronological
  const reversedUpdates = [...updates].reverse();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-releases-'));

  try {
    for (const update of reversedUpdates) {
      const tagName = update.version;
      const releaseTitle = `${update.version}: ${update.title}`;
      const releaseBody = formatUpdateToMarkdown(update);

      console.log(`----------------------------------------`);
      console.log(`Tag:     ${tagName}`);
      console.log(`Type:    ${update.type.toUpperCase()}`);
      console.log(`Title:   ${releaseTitle}`);
      console.log(`Date:    ${update.date}`);
      console.log(`Changes: ${update.changes.length} items`);

      if (isDryRun) {
        console.log(`Body Preview:\n${releaseBody.slice(0, 200)}...\n`);
        continue;
      }

      console.log(`Creating release for ${tagName} on ${repo}...`);

      if (useGhCli) {
        // Write body to temporary file to avoid command-line escaping problems
        const notesFile = path.join(tempDir, `${tagName}.md`);
        fs.writeFileSync(notesFile, releaseBody, 'utf-8');

        const ghArgs = [
          'release',
          'create',
          tagName,
          '--repo',
          repo,
          '--title',
          releaseTitle,
          '--notes-file',
          notesFile,
          '--target',
          'main',
        ];

        const ghProc = spawnSync('gh', ghArgs, { encoding: 'utf-8' });
        if (ghProc.status === 0) {
          const url = (ghProc.stdout || '').trim();
          console.log(`✅ Success (gh)! ${url || `Release ${tagName} created`}`);
        } else {
          const combinedErr = (ghProc.stderr || ghProc.stdout || '').trim();
          if (combinedErr.includes('already exists')) {
            console.log(`⚠️ Release or tag ${tagName} already exists on GitHub.`);
          } else {
            console.error(`❌ Error creating ${tagName} via gh: ${combinedErr}`);
          }
        }
      } else {
        // Fallback: GitHub REST API
        try {
          const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
            method: 'POST',
            headers: {
              Accept: 'application/vnd.github.v3+json',
              Authorization: `Bearer ${token}`,
              'User-Agent': 'KMUTNB-Reservation-Sync-Script',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tag_name: tagName,
              target_commitish: 'main',
              name: releaseTitle,
              body: releaseBody,
              draft: false,
              prerelease: false,
            }),
          });

          if (res.status === 201) {
            const created = await res.json();
            console.log(`✅ Success! Created release: ${created.html_url}`);
          } else if (res.status === 422) {
            console.log(`⚠️ Release or tag ${tagName} already exists (HTTP 422).`);
          } else {
            const errorText = await res.text();
            console.error(`❌ Failed (HTTP ${res.status}): ${errorText}`);
          }
        } catch (err: any) {
          console.error(`❌ Network error on ${tagName}:`, err.message);
        }
      }

      // Add 1s throttle between calls
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } finally {
    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Sync processing finished.');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
