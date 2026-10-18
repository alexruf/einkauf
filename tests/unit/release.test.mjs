import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const SCRIPT = join(ROOT, 'scripts/release.sh');

// Commits in the throw-away repositories must not depend on the developer's
// Git configuration, such as commit signing or a different default branch.
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, { cwd, env: { ...ENV, ...env }, encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

function git(cwd, ...args) {
  const result = run('git', args, cwd);
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

const versionFile = (version) => `// The version of the app.\nexport const VERSION = '${version}';\n`;

// A bare repository as `origin` and a clone with a version file, the
// project's changelog configuration and a few commits, all pushed.
function setup({ version = '2026.10.18.0' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'einkauf-release-'));
  const origin = join(dir, 'origin.git');
  const work = join(dir, 'work');
  git(dir, 'init', '--quiet', '--bare', '--initial-branch=main', origin);
  git(dir, 'init', '--quiet', '--initial-branch=main', work);
  mkdirSync(join(work, 'pb_public/js'), { recursive: true });
  writeFileSync(join(work, 'pb_public/js/version.js'), versionFile(version));
  copyFileSync(join(ROOT, 'cliff.toml'), join(work, 'cliff.toml'));
  git(work, 'add', '.');
  git(work, 'commit', '--quiet', '-m', 'chore: initialize project');
  commit(work, 'feat(web-app): add shopping list');
  commit(work, 'fix: keep items after reload');
  git(work, 'remote', 'add', 'origin', origin);
  git(work, 'push', '--quiet', '--set-upstream', 'origin', 'main');
  return { dir, origin, work };
}

// An empty commit with the given message.
function commit(cwd, message) {
  git(cwd, 'commit', '--quiet', '--allow-empty', '-m', message);
}

function commitAndPush(cwd, message) {
  commit(cwd, message);
  git(cwd, 'push', '--quiet', 'origin', 'main');
}

function release(cwd, date) {
  return run('bash', [SCRIPT], cwd, { RELEASE_DATE: date });
}

function releaseOk(cwd, date) {
  const result = release(cwd, date);
  assert.equal(result.status, 0, `release failed: ${result.stderr}`);
  return result;
}

const versionIn = (cwd) => readFileSync(join(cwd, 'pb_public/js/version.js'), 'utf8').match(/VERSION = '([^']+)'/)[1];
const tags = (cwd) => git(cwd, 'tag', '--list').split('\n').filter(Boolean);

test('given no release yet today, when releasing, then the version is today with counter 0 and is tagged', () => {
  const { work } = setup();
  releaseOk(work, '2026.10.19');
  assert.equal(versionIn(work), '2026.10.19.0');
  assert.deepEqual(tags(work), ['v2026.10.19.0']);
  assert.equal(git(work, 'rev-parse', 'v2026.10.19.0^{commit}'), git(work, 'rev-parse', 'HEAD'));
});

test('given a release earlier the same day, when releasing again, then the counter goes up', () => {
  const { work } = setup();
  releaseOk(work, '2026.10.19');
  git(work, 'push', '--quiet', 'origin', 'main', 'v2026.10.19.0');
  commitAndPush(work, 'feat: add categories');
  releaseOk(work, '2026.10.19');
  assert.equal(versionIn(work), '2026.10.19.1');
});

test('given the version file already holds today\'s version without a tag, when releasing, then the counter goes above it', () => {
  const { work } = setup({ version: '2026.10.18.0' });
  releaseOk(work, '2026.10.18');
  assert.equal(versionIn(work), '2026.10.18.1');
});

test('given a release tag that exists only on the remote, when releasing, then the counter goes above it', () => {
  const { dir, origin, work } = setup();
  const other = join(dir, 'other');
  git(dir, 'clone', '--quiet', origin, other);
  git(other, 'tag', '-a', 'v2026.10.19.0', '-m', 'Release 2026.10.19.0');
  git(other, 'push', '--quiet', 'origin', 'v2026.10.19.0');
  commitAndPush(other, 'feat: add categories');
  git(work, 'pull', '--quiet', '--no-tags', 'origin', 'main');
  assert.deepEqual(tags(work), []);

  releaseOk(work, '2026.10.19');
  assert.equal(versionIn(work), '2026.10.19.1');
});

test('given a release, then its commit has the uniform message and changes only the version file and the changelog', () => {
  const { work } = setup();
  releaseOk(work, '2026.10.19');
  assert.equal(git(work, 'log', '-1', '--format=%B'), 'chore(release): 2026.10.19.0');
  const files = git(work, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort();
  assert.deepEqual(files, ['CHANGELOG.md', 'pb_public/js/version.js']);
});

test('given a release, then the changelog lists features and fixes but no chore or release commits', () => {
  const { work } = setup();
  releaseOk(work, '2026.10.19');
  const changelog = readFileSync(join(work, 'CHANGELOG.md'), 'utf8');
  assert.match(changelog, /^## 2026\.10\.19\.0 /m);
  assert.match(changelog, /- \*\*web-app:\*\* Add shopping list/);
  assert.match(changelog, /- Keep items after reload/);
  assert.doesNotMatch(changelog, /initialize project/i);
  assert.doesNotMatch(changelog, /chore\(release\)|^- 2026\.10\.19\.0/m);
});

test('given a release, then its annotated tag carries the release notes', () => {
  const { work } = setup();
  releaseOk(work, '2026.10.19');
  const message = git(work, 'tag', '--list', '--format=%(contents)', 'v2026.10.19.0');
  assert.match(message, /^## 2026\.10\.19\.0 /);
  assert.match(message, /Add shopping list/);
});

// Git appends a tag signature directly after the message. Without a final
// newline, the signature does not start on its own line and is not found.
test('given a release, then the tag message ends with a newline so a signature stays valid', () => {
  const { work } = setup();
  releaseOk(work, '2026.10.19');
  const raw = run('git', ['cat-file', 'tag', 'v2026.10.19.0'], work).stdout;
  assert.ok(raw.endsWith('\n'), 'tag message must end with a newline');
  assert.doesNotMatch(raw, /\n\n$/);
});

test('given a release with only commits the changelog leaves out, then the tag message names the release', () => {
  const { work } = setup();
  releaseOk(work, '2026.10.19');
  git(work, 'push', '--quiet', 'origin', 'main', 'v2026.10.19.0');
  commitAndPush(work, 'chore: tidy up');
  releaseOk(work, '2026.10.19');
  assert.equal(git(work, 'tag', '--list', '--format=%(contents)', 'v2026.10.19.1'), 'Release 2026.10.19.1');
});

test('given a release, then nothing is pushed and the push command is printed', () => {
  const { origin, work } = setup();
  const before = git(origin, 'rev-parse', 'main');
  const { stdout } = releaseOk(work, '2026.10.19');
  assert.equal(git(origin, 'rev-parse', 'main'), before);
  assert.equal(git(origin, 'tag', '--list'), '');
  assert.match(stdout, /^ {2}git push origin main v2026\.10\.19\.0$/m);
});

// Everything a refused release must leave as it was.
const snapshot = (cwd) => ({
  head: git(cwd, 'rev-parse', 'HEAD'),
  status: git(cwd, 'status', '--porcelain'),
  tags: tags(cwd),
  version: versionIn(cwd),
});

function assertRefused(cwd, date, message) {
  const before = snapshot(cwd);
  const result = release(cwd, date);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, message);
  assert.deepEqual(snapshot(cwd), before);
}

test('given uncommitted changes, when releasing, then it is refused and nothing changes', () => {
  const { work } = setup();
  writeFileSync(join(work, 'notes.txt'), 'work in progress\n');
  assertRefused(work, '2026.10.19', /uncommitted changes/);
});

test('given another branch than main, when releasing, then it is refused and nothing changes', () => {
  const { work } = setup();
  git(work, 'switch', '--quiet', '--create', 'feature');
  assertRefused(work, '2026.10.19', /only created from main/);
});

test('given local commits not on origin, when releasing, then it is refused and nothing changes', () => {
  const { work } = setup();
  commit(work, 'feat: not pushed yet');
  assertRefused(work, '2026.10.19', /main must match origin\/main/);
});

test('given commits on origin missing locally, when releasing, then it is refused and nothing changes', () => {
  const { dir, origin, work } = setup();
  const other = join(dir, 'other');
  git(dir, 'clone', '--quiet', origin, other);
  commitAndPush(other, 'feat: made elsewhere');
  assertRefused(work, '2026.10.19', /main must match origin\/main/);
});

test('given the current commit already is a release, when releasing, then it is refused and nothing changes', () => {
  const { work } = setup();
  releaseOk(work, '2026.10.19');
  git(work, 'push', '--quiet', 'origin', 'main', 'v2026.10.19.0');
  assertRefused(work, '2026.10.19', /nothing to release/);
});
