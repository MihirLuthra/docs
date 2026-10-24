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

/**
 * The GitHub account of an email the commits list didn't cover (typically a
 * co-author), from the public commit search: one request per email, at most
 * MAX_SEARCHES (unauthenticated search allows 10 a minute).
 */
const MAX_SEARCHES = 8;
async function searchAccount(email: string): Promise<{login: string; avatar: string} | undefined> {
  try {
    const res = await fetch(
      `https://api.github.com/search/commits?q=${encodeURIComponent(`author-email:${email}`)}&per_page=1`,
      {headers: {Accept: 'application/vnd.github+json'}, signal: AbortSignal.timeout(TIMEOUT_MS)},
    );
    if (!res.ok) return undefined;
    const {items} = (await res.json()) as {items: GitHubCommit[]};
    const author = items[0]?.author;
    return author ? {login: author.login, avatar: author.avatar_url} : undefined;
  } catch {
    return undefined;
  }
}

const isBot = (name: string, login?: string) => /\[bot\]$/i.test(login ?? '') || /\[bot\]$/i.test(name);

/**
 * Contributors for every doc page, like GitHub's file contributors (commit
 * authors and Co-authored-by trailers, one commit each), worked out when the
 * site is built: `git log --follow` per page file (follows renames), and
 * GitHub accounts and avatars from the public API. Published as global data
 * for components/Contributors.
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

      // Per page, its commits' contributors, newest commit first: the author,
      // then any Co-authored-by trailers ("Name <email>").
      const logs = docs.loadedVersions[0].docs.map((doc) => {
        const file = path.resolve(context.siteDir, doc.source.replace(/^@site\//, ''));
        const out = git(root, [
          'log',
          '--follow',
          '--format=%an%x1f%ae%x1f%(trailers:key=Co-authored-by,valueonly,separator=%x1d)%x1e',
          '--',
          file,
        ]);
        const commits = out
          .split('\x1e')
          .map((record) => record.trim())
          .filter(Boolean)
          .map((record) => {
            const [name, email, trailers] = record.split('\x1f');
            const coAuthors = (trailers ?? '')
              .split('\x1d')
              .map((t) => /^(.*?)\s*<([^>]+)>$/.exec(t.trim()))
              .filter((m): m is RegExpExecArray => !!m)
              .map((m) => ({name: m[1], email: m[2]}));
            return [{name, email}, ...coAuthors];
          });
        return {doc, file, commits};
      });

      // Emails the commits list didn't cover (co-authors): GitHub's search.
      const unknown = new Set(
        logs.flatMap((l) => l.commits.flat()).map((c) => c.email.toLowerCase()).filter((e) => !accounts.has(e)),
      );
      for (const email of [...unknown].slice(0, MAX_SEARCHES)) {
        const account = await searchAccount(email);
        if (account) accounts.set(email, account);
      }

      const people: Person[] = [];
      const personIndex = new Map<string, number>();
      const pages: Contributors['pages'] = {};

      for (const {doc, file, commits} of logs) {
        if (commits.length === 0) continue;
        // Per contributor: commits, and their order of last commit (newest
        // first), for ties.
        const byAuthor = new Map<number, {commits: number; recent: number}>();
        for (const commit of commits) {
          // Each person once per commit, even if both author and co-author.
          const inCommit = new Set<number>();
          for (const {name, email: rawEmail} of commit) {
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
            inCommit.add(index);
          }
          for (const index of inCommit) {
            const entry = byAuthor.get(index);
            if (entry) entry.commits += 1;
            else byAuthor.set(index, {commits: 1, recent: byAuthor.size});
          }
        }
        if (byAuthor.size === 0) continue;
        pages[doc.permalink.replace(/\/+$/, '') || '/'] = {
          file: path.relative(root, file),
          authors: [...byAuthor]
            .sort(([, a], [, b]) => b.commits - a.commits || a.recent - b.recent)
            .map(([person, {commits}]) => ({person, commits})),
        };
      }
      actions.setGlobalData({repo: options.repo, branch: options.branch, people, pages} satisfies Contributors);
    },
  };
}
