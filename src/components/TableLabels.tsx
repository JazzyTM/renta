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
          let i = 0, main: HTMLTableCellElement | null = null;
          for (const td of tr.children as HTMLCollectionOf<HTMLTableCellElement>) {
            const label = td.colSpan > 1 ? "" : heads[i] ?? "";
            if (td.dataset.label !== label) td.dataset.label = label;
            // Главная ячейка (название со ссылкой) на телефоне идёт заголовком карточки
            if (!main && label && td.colSpan <= 1 && td.querySelector("a, b") && !td.querySelector("input, select, button")) main = td;
            i += td.colSpan || 1;
          }
          if (!main) main = [...(tr.children as HTMLCollectionOf<HTMLTableCellElement>)].find(td => td.dataset.label && td.colSpan <= 1 && !td.classList.contains("num") && td.textContent?.trim() && !td.querySelector("input, select, button")) ?? null;
          for (const td of tr.children as HTMLCollectionOf<HTMLTableCellElement>) {
            if (td === main) { if (td.dataset.main !== "1") td.dataset.main = "1"; }
            else if (td.dataset.main) delete td.dataset.main;
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
