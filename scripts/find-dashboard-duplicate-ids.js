/**
 * Find duplicate HTML id attributes in the rendered dashboard template.
 *
 * Usage:
 *   node scripts/find-dashboard-duplicate-ids.js
 */

import fs from 'fs';
import path from 'path';

function renderHtmlWithPartials(entryFilePath, partialsRootDir) {
  const visited = new Set();

  const renderFile = (filePath) => {
    const abs = path.resolve(filePath);
    if (visited.has(abs)) throw new Error(`Circular partial include detected: ${abs}`);
    visited.add(abs);

    let html = fs.readFileSync(abs, 'utf8');
    html = html.replace(/\{\{>\s*([a-zA-Z0-9/_-]+)\s*\}\}/g, (_match, partialName) => {
      const partialPath = path.join(partialsRootDir, `${partialName}.html`);
      return renderFile(partialPath);
    });

    visited.delete(abs);
    return html;
  };

  return renderFile(entryFilePath);
}

const entry = path.join('views', 'dashboard', 'template.html');
const partialsRoot = path.join('views', 'dashboard', 'partials');
const html = renderHtmlWithPartials(entry, partialsRoot);

const re = /\bid\s*=\s*"([^"]+)"/g;
const counts = new Map();
let match;
while ((match = re.exec(html))) {
  const id = match[1];
  counts.set(id, (counts.get(id) || 0) + 1);
}

const dups = [...counts.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);

console.log(`total ids: ${[...counts.values()].reduce((a, b) => a + b, 0)}`);
console.log(`unique ids: ${counts.size}`);
console.log(`duplicate ids: ${dups.length}`);
console.log('');
for (const [id, c] of dups.slice(0, 200)) {
  console.log(`${c}\t${id}`);
}

