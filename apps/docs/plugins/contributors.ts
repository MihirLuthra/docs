import {execFileSync} from 'node:child_process';
import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import type {Contributors, Person} from '../src/components/Contributors/types';

type DocMeta = {permalink: string; source: string};
type LoadedVersion = {docs: DocMeta[]};

// GitHub's commits list, as much of it as this reads.
type GitHubCommit = {
  commit: {author: {email: string}};
  author: {login: string; avatar_url: string; type?: string} | null;
};

const PAGE_SIZE = 100;
// At most this many requests (×100 commits) per build; unauthenticated
// requests are limited to 60 an hour.
const MAX_REQUESTS = 10;
const TIMEOUT_MS = 8000;

const git = (cwd: string, args: string[]): string =>
  execFileSync('git', args, {cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});

/**
 * GitHub accounts (login, avatar) by commit email, from the repo's public
 * commits list. Email is how the commits are matched, so commits not pushed
 * yet still find their author. Fails soft: on any error, names only.
 */
async function githubAccounts(repo: string, branch: string): Promise<Map<string, {login: string; avatar: string}>> {
  const accounts = new Map<string, {login: string; avatar: string}>();
  for (let page = 1; page <= MAX_REQUESTS; page++) {
    const url = `https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${PAGE_SIZE}&page=${page}`;
    let commits: GitHubCommit[];
    try {
      const res = await fetch(url, {
        headers: {Accept: 'application/vnd.github+json'},
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        console.warn(`[contributors] GitHub API ${res.status} for ${repo}@${branch}; showing names only`);
        break;
      }
      commits = (await res.json()) as GitHubCommit[];
    } catch (e) {
      console.warn(`[contributors] GitHub API unreachable (${String(e)}); showing names only`);
      break;
    }
    for (const {commit, author} of commits) {
      const email = commit.author.email.toLowerCase();
      if (author && !accounts.has(email)) accounts.set(email, {login: author.login, avatar: author.avatar_url});
    }
    if (commits.length < PAGE_SIZE) break;
  }
  return accounts;
}

const isBot = (name: string, login?: string) => /\[bot\]$/i.test(login ?? '') || /\[bot\]$/i.test(name);

/**
 * Contributors for every doc page, like GitHub's file contributors (commit
 * authors; co-author trailers aren't counted), worked out when the site is
 * built: `git log --follow` per page file (follows renames), and GitHub
 * accounts and avatars from the public API. Published as global data for
 * the doc footer (components/Contributors).
 */
export default function contributorsPlugin(context: LoadContext, options: {repo: string; branch: string}): Plugin {
  return {
    name: 'contributors',
    async allContentLoaded({allContent, actions}) {
      const docs = allContent['docusaurus-plugin-content-docs']?.default as {loadedVersions: LoadedVersion[]} | undefined;
      if (!docs) throw new Error('contributors: docs plugin not loaded');
      const root = git(context.siteDir, ['rev-parse', '--show-toplevel']).trim();
      if (git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
        console.warn('[contributors] shallow clone: contributors will be incomplete (fetch the full history)');
      }
      const branch = process.env.CONTRIBUTORS_BRANCH ?? git(root, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
      const accounts = await githubAccounts(options.repo, branch);

      const people: Person[] = [];
      const personIndex = new Map<string, number>();
      const pages: Contributors['pages'] = {};

      for (const doc of docs.loadedVersions[0].docs) {
        const file = path.resolve(context.siteDir, doc.source.replace(/^@site\//, ''));
        const log = git(root, ['log', '--follow', '--format=%an%x1f%ae%x1f%aI', '--', file]).trim();
        if (!log) continue;
        // Per author: commits and latest date; git log is newest first.
        const byAuthor = new Map<number, {commits: number; last: string}>();
        let updated: {date: string; person: number} | undefined;
        for (const line of log.split('\n')) {
          const [name, rawEmail, date] = line.split('\x1f');
          const email = rawEmail.toLowerCase();
          const account = accounts.get(email);
          if (isBot(name, account?.login)) continue;
          // One person per GitHub account, else per email.
          const id = account ? `gh:${account.login}` : `email:${email}`;
          let index = personIndex.get(id);
          if (index === undefined) {
            index = people.push({name, ...(account && {login: account.login, avatar: account.avatar})}) - 1;
            personIndex.set(id, index);
          }
          updated ??= {date, person: index};
          const entry = byAuthor.get(index);
          if (entry) entry.commits += 1;
          else byAuthor.set(index, {commits: 1, last: date});
        }
        if (!updated) continue;
        pages[doc.permalink.replace(/\/+$/, '') || '/'] = {
          file: path.relative(root, file),
          authors: [...byAuthor]
            .sort(([, a], [, b]) => b.commits - a.commits || b.last.localeCompare(a.last))
            .map(([person, {commits}]) => ({person, commits})),
          updated,
        };
      }
      actions.setGlobalData({repo: options.repo, branch: options.branch, people, pages} satisfies Contributors);
    },
  };
}
