/**
 * Group generate-licenses output by package name so each package is one row
 * listing every installed version (no duplicate rows).
 */
function groupLicenses(list) {
  const byName = new Map();
  for (const entry of list) {
    let group = byName.get(entry.name);
    if (!group) {
      group = { name: entry.name, versions: [], licenseTypes: [], entries: [] };
      byName.set(entry.name, group);
    }
    if (!group.versions.includes(entry.version)) group.versions.push(entry.version);
    if (!group.licenseTypes.includes(entry.license)) group.licenseTypes.push(entry.license);
    group.entries.push(entry);
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Distinct license texts for a group. Versions that share a text are listed
 * together so the same text is never printed twice.
 */
function groupTexts(group, texts) {
  const sections = new Map();
  for (const e of group.entries) {
    let text = e.textId ? texts[e.textId] || "" : "";
    if (!text) text = `License: ${e.license}\n\nFull license text not available in the package.`;
    if (e.copyright && !text.includes(e.copyright)) text = `${e.copyright}\n\n${text}`;
    const versions = sections.get(text) || [];
    if (!versions.includes(e.version)) versions.push(e.version);
    sections.set(text, versions);
  }
  return Array.from(sections.entries()).map(([text, versions]) => ({ text, versions }));
}

/** Parse lib/generated/licenses.ts (JSON literals written by generate-licenses.js). */
function parseGeneratedLicenses(source) {
  const textsMatch = source.match(/export const LICENSE_TEXTS[^=]*=\s*(\{[\s\S]*?\n\});/);
  const listMatch = source.match(/export const licenses[^=]*=\s*(\[[\s\S]*?\n\]);/);
  if (!textsMatch || !listMatch) throw new Error("Could not parse lib/generated/licenses.ts");
  return { texts: JSON.parse(textsMatch[1]), licenses: JSON.parse(listMatch[1]) };
}

module.exports = { groupLicenses, groupTexts, parseGeneratedLicenses };
