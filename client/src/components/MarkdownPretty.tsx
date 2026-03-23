import React, { useMemo, useEffect, useRef, useId } from "react";
import mermaid from "mermaid";

/**
 * Markdown renderer mínimo com suporte a Mermaid.
 * Suporta:
 * - headings (#, ##, ###)
 * - bold/italic
 * - listas simples
 * - tabelas markdown simples
 * - code fences ```...```
 * - blockquotes
 * - blocos ```mermaid → renderizados como SVG
 */

// Inicializar mermaid uma vez
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  themeVariables: {
    primaryColor: "#6B3FD9",
    primaryTextColor: "#fff",
    primaryBorderColor: "#5a2fc2",
    lineColor: "#00A8E8",
    secondaryColor: "#f0ebff",
    tertiaryColor: "#e8f7fd",
  },
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(md: string) {
  md = md.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  md = md.replace(/\*(.+?)\*/g, "<em>$1</em>");
  md = md.replace(/`(.+?)`/g, "<code>$1</code>");
  return md;
}

function renderTable(lines: string[]) {
  const rows = lines
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));
  if (rows.length < 2) return null;

  const head = rows[0].split("|").slice(1, -1).map((c) => inline(escapeHtml(c.trim())));
  const bodyRows = rows.slice(2).map((r) => r.split("|").slice(1, -1).map((c) => inline(escapeHtml(c.trim()))));

  const thead = `<thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<div class="md-table"><table>${thead}${tbody}</table></div>`;
}

interface ParsedBlock {
  type: "html" | "mermaid";
  content: string;
}

export function parseMarkdown(md: string): ParsedBlock[] {
  const src = md.replace(/\r\n/g, "\n");
  const lines = src.split("\n");

  const blocks: ParsedBlock[] = [];
  let htmlParts: string[] = [];

  function flushHtml() {
    if (htmlParts.length > 0) {
      blocks.push({ type: "html", content: htmlParts.join("\n") });
      htmlParts = [];
    }
  }

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // code fence
    if (line.trim().startsWith("```")) {
      const fenceLang = line.trim().slice(3).trim().toLowerCase();
      i++;
      const code: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // consume closing fence

      if (fenceLang === "mermaid") {
        flushHtml();
        blocks.push({ type: "mermaid", content: code.join("\n") });
      } else {
        htmlParts.push(
          `<pre class="md-code"><code>${escapeHtml(code.join("\n"))}</code></pre>`
        );
      }
      continue;
    }

    // table block
    if (line.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      const tableHtml = renderTable(tableLines);
      if (tableHtml) {
        htmlParts.push(tableHtml);
        i = j;
        continue;
      }
    }

    // headings
    if (line.startsWith("# ")) {
      htmlParts.push(`<h1>${inline(escapeHtml(line.slice(2).trim()))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      htmlParts.push(`<h2>${inline(escapeHtml(line.slice(3).trim()))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      htmlParts.push(`<h3>${inline(escapeHtml(line.slice(4).trim()))}</h3>`);
      i++;
      continue;
    }

    // blockquote
    if (line.trim().startsWith(">")) {
      const q = line.trim().replace(/^>\s?/, "");
      htmlParts.push(`<blockquote>${inline(escapeHtml(q))}</blockquote>`);
      i++;
      continue;
    }

    // unordered list
    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("- ")) {
        items.push(lines[j].trim().slice(2));
        j++;
      }
      htmlParts.push(`<ul>${items.map((x) => `<li>${inline(escapeHtml(x))}</li>`).join("")}</ul>`);
      i = j;
      continue;
    }

    // horizontal rule
    if (line.trim() === "---") {
      htmlParts.push(`<hr />`);
      i++;
      continue;
    }

    // blank line
    if (!line.trim()) {
      htmlParts.push(`<div class="md-spacer"></div>`);
      i++;
      continue;
    }

    // paragraph
    htmlParts.push(`<p>${inline(escapeHtml(line.trim()))}</p>`);
    i++;
  }

  flushHtml();
  return blocks;
}

// Backward compat: markdownToHtml (sem mermaid, retorna string)
export function markdownToHtml(md: string) {
  const blocks = parseMarkdown(md);
  return blocks.map((b) => b.type === "html" ? b.content : `<pre class="md-code"><code>${escapeHtml(b.content)}</code></pre>`).join("\n");
}

function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, "_");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!containerRef.current) return;
      try {
        const { svg } = await mermaid.render(`mermaid_${uniqueId}`, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<pre class="md-code" style="color:#c00;"><code>Erro ao renderizar diagrama:\n${escapeHtml(String(err))}</code></pre>`;
        }
      }
    }
    render();
    return () => { cancelled = true; };
  }, [code, uniqueId]);

  return (
    <div
      ref={containerRef}
      className="md-mermaid"
      style={{ display: "flex", justifyContent: "center", margin: "16px 0", overflow: "auto" }}
    />
  );
}

export default function MarkdownPretty({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdown(markdown || ""), [markdown]);

  return (
    <div className="md-root">
      {blocks.map((block, idx) =>
        block.type === "mermaid" ? (
          <MermaidBlock key={idx} code={block.content} />
        ) : (
          <div key={idx} dangerouslySetInnerHTML={{ __html: block.content }} />
        )
      )}
    </div>
  );
}
