/** Someone who has committed to a doc page (plugins/contributors.ts). */
export type Person = {
  name: string;
  /** GitHub account, when the commit email is linked to one. */
  login?: string;
  avatar?: string;
};

/** Global data from the contributors plugin. */
export type Contributors = {
  /** owner/name on GitHub. */
  repo: string;
  /** Branch the history links point to (the one edit links use). */
  branch: string;
  /** Everyone, once; pages refer to them by index. */
  people: Person[];
  /** By permalink (no trailing slash). */
  pages: {
    [permalink: string]: {
      /** Path from the repo root, for the GitHub history link. */
      file: string;
      /** Most commits first. */
      authors: Array<{person: number; commits: number}>;
      /** The latest commit: ISO date and its author. */
      updated: {date: string; person: number};
    };
  };
};
