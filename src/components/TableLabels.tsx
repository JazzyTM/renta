"use client";
import { useEffect } from "react";

// На телефоне таблицы показываются карточками: каждой ячейке нужна подпись из заголовка столбца.
export function TableLabels() {
  useEffect(() => {
    let raf = 0;
    const run = () => {
      raf = 0;
      document.querySelectorAll<HTMLTableElement>("table.t").forEach(t => {
        const heads = [...t.querySelectorAll("thead th")].map(th => th.textContent?.trim() ?? "");
        if (!heads.length) return;
        t.querySelectorAll("tbody tr").forEach(tr => {
          let i = 0;
          for (const td of tr.children as HTMLCollectionOf<HTMLTableCellElement>) {
            const label = td.colSpan > 1 ? "" : heads[i] ?? "";
            if (td.dataset.label !== label) td.dataset.label = label;
            i += td.colSpan || 1;
          }
        });
      });
    };
    run();
    const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(run); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
