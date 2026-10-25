import fs from 'node:fs';
import path from 'node:path';

/** Version data (versions/ at the repo root; see versions/README.md). */

export const VERSION_STATUSES = ['pending-qa', 'current', 'supported', 'deprecated', 'end-of-life'] as const;
export const COMBINATION_STATUSES = ['verified', 'preview', 'documented'] as const;

export type VersionStatus = (typeof VERSION_STATUSES)[number];
export type ComponentVersion = {
  version: string;
  status: VersionStatus;
  date: string | null;
  requires?: Record<string, string>;
  notes?: string;
  source?: string;
};
export type Component = {id: string; name: string; owner: string; artifact: string; versions: ComponentVersion[]};
export type Combination = {
  id: string;
  status: (typeof COMBINATION_STATUSES)[number];
  runtime: string;
  solutions: string[];
  components: Record<string, string>;
  platform: Record<string, string | null>;
  tested_by: string | null;
  date: string | null;
  source?: string;
};
export type VersionsData = {components: Component[]; combinations: Combination[]};

/** The versions folder, from apps/docs. */
export const VERSIONS_DIR = path.resolve(__dirname, '../../../versions');

let cached: VersionsData | undefined;

/**
 * Reads and validates the data (once, unless `fresh`, e.g. after the files
 * change in dev); throws on any problem.
 */
export function loadVersions(fresh = false): VersionsData {
  if (cached && !fresh) return cached;
  const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(VERSIONS_DIR, file), 'utf8')) as T;
  const data: VersionsData = {
    components: read<{components: Component[]}>('components.json').components,
    combinations: read<{combinations: Combination[]}>('tested.json').combinations,
  };
  const problems = validate(data);
  if (problems.length) {
    throw new Error(`versions/: ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  }
  cached = data;
  return data;
}

function validate({components, combinations}: VersionsData): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const c of components) {
    if (ids.has(c.id)) problems.push(`components.json: duplicate component "${c.id}"`);
    ids.add(c.id);
    const seen = new Set<string>();
    for (const v of c.versions) {
      if (seen.has(v.version)) problems.push(`${c.id}: duplicate version ${v.version}`);
      seen.add(v.version);
      if (!VERSION_STATUSES.includes(v.status)) problems.push(`${c.id}@${v.version}: unknown status "${v.status}"`);
      if (v.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) problems.push(`${c.id}@${v.version}: date must be YYYY-MM-DD or null`);
    }
    if (c.versions.filter((v) => v.status === 'current').length > 1) problems.push(`${c.id}: more than one current version`);
  }
  const comboIds = new Set<string>();
  for (const t of combinations) {
    if (comboIds.has(t.id)) problems.push(`tested.json: duplicate combination "${t.id}"`);
    comboIds.add(t.id);
    if (!COMBINATION_STATUSES.includes(t.status)) problems.push(`${t.id}: unknown status "${t.status}"`);
    if (t.status === 'verified' && (!t.tested_by || !t.date)) problems.push(`${t.id}: verified needs tested_by and date`);
    for (const [id, version] of Object.entries(t.components)) {
      const component = components.find((c) => c.id === id);
      if (!component) problems.push(`${t.id}: unknown component "${id}"`);
      else if (!component.versions.some((v) => v.version === version)) problems.push(`${t.id}: unknown version ${id}@${version}`);
    }
  }
  return problems;
}

/** The version pages show: the current one, else none. */
export function currentVersion(component: Component): ComponentVersion | undefined {
  return component.versions.find((v) => v.status === 'current');
}

/**
 * The value of a reference like "coco-keyprovider.version",
 * "coco-keyprovider.artifact" or "fortanix-kata-deploy.requires.kubernetes"
 * (from the current version). Throws when it can't be resolved.
 */
export function resolveReference(reference: string): string {
  const [id, field, ...rest] = reference.split('.');
  const component = loadVersions().components.find((c) => c.id === id);
  if (!component) throw new Error(`versions: unknown component "${id}" in {{${reference}}}`);
  if (field === 'name' || field === 'artifact' || field === 'owner') return component[field];
  const current = currentVersion(component);
  if (!current) throw new Error(`versions: "${id}" has no current version, for {{${reference}}}`);
  if (field === 'version') return current.version;
  if (field === 'requires' && rest.length === 1) {
    const range = current.requires?.[rest[0]];
    if (range) return range;
  }
  throw new Error(`versions: can't resolve {{${reference}}}`);
}

/** Checks an applies_to entry ("component@version"); returns a problem or null. */
export function checkAppliesTo(entry: string): string | null {
  const [id, version] = entry.split('@');
  const component = loadVersions().components.find((c) => c.id === id);
  if (!component) return `unknown component "${id}"`;
  const v = component.versions.find((x) => x.version === version);
  if (!v) return `unknown version ${entry}`;
  if (v.status === 'end-of-life') return `${entry} is end of life`;
  return null;
}
