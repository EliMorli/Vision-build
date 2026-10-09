/**
 * Minimal Markdown -> HTML renderer for the legal site (no dependencies).
 * Supports: headings, paragraphs (single newlines become <br>), bold, italic,
 * inline code, links, bare URLs, ordered/unordered lists, blockquotes,
 * tables and horizontal rules. All text is HTML-escaped first.
 */

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inline(text) {
  let s = escapeHtml(text);
  const links = [];
  // [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    links.push(`<a href="${u}">${t}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  // bare URLs
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:])/g, (_, pre, u) => {
    links.push(`<a href="${u}">${u}</a>`);
    return `${pre}\u0000${links.length - 1}\u0000`;
  });
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  // Draft markers stand out until they are removed for release
  s = s.replace(/\[(NOTE[^\]]*|CONFIRM|ATTORNEY DECISION[^\]]*)\]/g, '<mark class="draft-note">[$1]</mark>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
  return s;
}

function renderTable(lines) {
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const head = cells(lines[0]);
  const body = lines.slice(2).map(cells);
  return (
    '<div class="table-wrap"><table><thead><tr>' +
    head.map((h) => `<th>${inline(h)}</th>`).join("") +
    "</tr></thead><tbody>" +
    body.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") +
    "</tbody></table></div>"
  );
}

function render(md, { toc } = {}) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const headings = [];
  let i = 0;
  const isBlockStart = (l) =>
    /^(#{1,6})\s/.test(l) || /^\s*([-*]|\d+\.)\s+/.test(l) || /^>/.test(l) || /^\|/.test(l) || /^-{3,}\s*$/.test(l) || l.trim() === "";

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const html = inline(h[2]);
      const id = slugify(html);
      if (level === 2) headings.push({ id, html });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++;
      continue;
    }
    if (/^-{3,}\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const block = [];
      while (i < lines.length && /^\|/.test(lines[i])) block.push(lines[i++]);
      out.push(renderTable(block));
      continue;
    }
    if (/^>/.test(line)) {
      const block = [];
      while (i < lines.length && /^>/.test(lines[i])) block.push(lines[i++].replace(/^>\s?/, ""));
      const isDraft = /DRAFT|\[NOTE|\[ATTORNEY|\[CONFIRM/.test(block.join(" "));
      out.push(`<blockquote${isDraft ? ' class="draft"' : ""}>${render(block.join("\n")).html}</blockquote>`);
      continue;
    }
    const li = line.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const ordered = /\d+\./.test(li[1]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*([-*]|\d+\.)\s+(.*)$/);
        if (m) { items.push(m[2]); i++; continue; }
        // continuation line of the previous item
        if (lines[i].trim() !== "" && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
          continue;
        }
        break;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>` + items.map((t) => `<li>${inline(t)}</li>`).join("") + `</${tag}>`);
      continue;
    }
    const para = [];
    while (i < lines.length && !isBlockStart(lines[i])) para.push(lines[i++]);
    if (para.length === 0) { para.push(lines[i++]); }
    out.push(`<p>${para.map(inline).join("<br>")}</p>`);
  }
  return { html: out.join("\n"), headings: toc ? headings : [] };
}

module.exports = { render, escapeHtml, inline, slugify };
