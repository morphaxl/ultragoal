#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const MARKETPLACE = 'morphaxl/ultragoal';
const MARKETPLACE_NAME = 'ultragoal';
const PLUGIN = 'ultragoal@ultragoal';

const args = process.argv.slice(2);

function claude(cmdArgs, { quiet = false } = {}) {
  const res = spawnSync('claude', cmdArgs, {
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (res.error && res.error.code === 'ENOENT') {
    console.error('\n✗ Claude Code CLI not found.');
    console.error('  Install it first: https://claude.com/claude-code\n');
    process.exit(1);
  }
  return res;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
ultragoal — goal loops for Claude Code
Tell Claude what you want once. It works until the job is verifiably done.

Usage:
  npx ultragoal              install for you (user scope)
  npx ultragoal --project    install for the team (project scope, lands in .claude/settings.json)
  npx ultragoal uninstall    remove the plugin

This wraps Claude Code's native plugin system:
  claude plugin marketplace add ${MARKETPLACE}
  claude plugin install ${PLUGIN} [--scope project]

Docs: https://github.com/morphaxl/ultragoal
`);
  process.exit(0);
}

if (args[0] === 'uninstall') {
  const res = claude(['plugin', 'uninstall', PLUGIN]);
  process.exit(res.status ?? 0);
}

const scope = args.includes('--project') ? 'project' : null;

console.log('▸ Adding the ultragoal marketplace…');
const add = claude(['plugin', 'marketplace', 'add', MARKETPLACE], { quiet: true });
if (add.status !== 0) {
  // Most likely it's already known — refresh it so install sees the latest version.
  claude(['plugin', 'marketplace', 'update', MARKETPLACE_NAME], { quiet: true });
}

console.log('▸ Installing the plugin…');
const installArgs = ['plugin', 'install', PLUGIN];
if (scope) installArgs.push('--scope', scope);
let res = claude(installArgs);
if (res.status !== 0) {
  console.log('▸ Already installed? Updating instead…');
  res = claude(['plugin', 'update', PLUGIN]);
}

if ((res.status ?? 1) === 0) {
  console.log(`
✓ ultragoal is ready${scope ? ' (project scope)' : ''}.

Open Claude Code in any repo and describe what you want:

  /ultragoal:goal <your messy brain dump — a raw voice transcript is fine>

Docs: https://github.com/morphaxl/ultragoal
`);
} else {
  console.error('\n✗ Something went wrong. Try the manual route:');
  console.error(`    claude plugin marketplace add ${MARKETPLACE}`);
  console.error(`    claude plugin install ${PLUGIN}\n`);
  process.exit(res.status ?? 1);
}
