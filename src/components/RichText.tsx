import Link from "next/link";
import { Fragment } from "react";

// Простая разметка без HTML: ## заголовок, - пункт, [текст](ссылка), **жирный**. Безопасно: всё рендерится как текст.
function inline(s: string) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) {
    parts.push(s.slice(last, m.index));
    if (m[1]) {
      const href = m[2];
      const safe = href.startsWith("/") || /^https?:\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
      parts.push(!safe ? m[1] : href.startsWith("/") ? <Link key={i++} href={href}>{m[1]}</Link> : <a key={i++} href={href} rel="nofollow noopener" target="_blank">{m[1]}</a>);
    } else parts.push(<b key={i++}>{m[3]}</b>);
    last = re.lastIndex;
  }
  parts.push(s.slice(last));
  return parts;
}

export function RichText({ text, className = "prose" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((b, k) => {
        if (b.startsWith("### ")) return <h3 key={k}>{inline(b.slice(4))}</h3>;
        if (b.startsWith("## ")) return <h2 key={k}>{inline(b.slice(3))}</h2>;
        const lines = b.split("\n");
        if (lines.every(l => /^[-*] /.test(l))) return <ul key={k}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        if (lines.every(l => /^\d+[.)] /.test(l))) return <ol key={k}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+[.)] /, ""))}</li>)}</ol>;
        return <p key={k}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
