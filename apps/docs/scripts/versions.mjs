#!/usr/bin/env node
// Release flow for versions/components.json (see versions/README.md).
//   versions add <component> <version>      add as pending-qa (for a release)
//   versions promote <component> <version>  make it current; the previous
//                                           current becomes supported
//   versions status <component> <version> <status>
// The build validates the result.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../versions/components.json');
const STATUSES = ['pending-qa', 'current', 'supported', 'deprecated', 'end-of-life'];
const [command, id, version, status] = process.argv.slice(2);

const fail = (message) => {
  console.error(`versions: ${message}`);
  process.exit(1);
};
if (!['add', 'promote', 'status'].includes(command) || !id || !version) {
  fail('usage: versions add|promote <component> <version>, or versions status <component> <version> <status>');
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const component = data.components.find((c) => c.id === id);
if (!component) fail(`unknown component "${id}" (known: ${data.components.map((c) => c.id).join(', ')})`);
const existing = component.versions.find((v) => v.version === version);

if (command === 'add') {
  if (existing) fail(`${id}@${version} already exists (${existing.status})`);
  component.versions.unshift({version, status: 'pending-qa', date: null});
} else if (command === 'promote') {
  if (!existing) fail(`${id}@${version} doesn't exist; add it first`);
  for (const v of component.versions) if (v.status === 'current') v.status = 'supported';
  existing.status = 'current';
  existing.date ??= new Date().toISOString().slice(0, 10);
} else {
  if (!existing) fail(`${id}@${version} doesn't exist`);
  if (!STATUSES.includes(status)) fail(`status must be one of ${STATUSES.join(', ')}`);
  existing.status = status;
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`versions: ${id}@${version} ${command === 'status' ? `is now ${status}` : command === 'add' ? 'added (pending-qa)' : 'is now current'}`);
