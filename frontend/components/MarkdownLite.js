// Minimal markdown renderer for AI chat replies -- bold, inline code,
// links, and bullet/numbered lists. Intentionally not a full markdown
// parser (no new dependency needed for this), just enough for the kind
// of formatting Gemini tends to reply with.

function renderInline(text, keyPrefix) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    if (match[1]) {
      parts.push(<strong key={`${keyPrefix}-b${i++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={`${keyPrefix}-c${i++}`} className="px-1 py-0.5 rounded bg-ink/10 text-[0.85em] font-mono">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      parts.push(
        <a
          key={`${keyPrefix}-a${i++}`}
          href={match[7]}
          target="_blank"
          rel="noreferrer"
          className="underline text-violet"
        >
          {match[6]}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function MarkdownLite({ text }) {
  const lines = (text || "").split("\n");
  const blocks = [];
  let listBuffer = [];
  let listType = null; // "ul" | "ol"

  function flushList() {
    if (!listBuffer.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    blocks.push(
      <Tag
        key={`list-${blocks.length}`}
        className={Tag === "ol" ? "list-decimal pl-5 space-y-0.5" : "list-disc pl-5 space-y-0.5"}
      >
        {listBuffer.map((item, idx) => (
          <li key={idx}>{renderInline(item, `li-${blocks.length}-${idx}`)}</li>
        ))}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  }

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)/);

    if (bulletMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(bulletMatch[1]);
      return;
    }
    if (numberedMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(numberedMatch[1]);
      return;
    }

    flushList();
    if (line.trim() === "") {
      blocks.push(<div key={`sp-${idx}`} className="h-1.5" />);
    } else {
      blocks.push(
        <p key={`p-${idx}`} className="leading-relaxed">
          {renderInline(line, `p-${idx}`)}
        </p>
      );
    }
  });
  flushList();

  return <div className="space-y-1">{blocks}</div>;
}
