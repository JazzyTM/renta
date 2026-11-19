// Стрелка «влево/вправо» рисунком: символы ‹ › в шрифте стоят неровно
export function Chevron({ dir, size = 18 }: { dir: "left" | "right"; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: "block" }}><path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
