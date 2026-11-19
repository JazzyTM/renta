// Знак «Наберегу»: солнце над волнами в коралловом квадрате
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-m" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent, #F2543D)" />
      <path d="M9.5 17a6.5 6.5 0 0 1 13 0z" fill="#fff" />
      <path d="M5 21.2c2.75 0 2.75-1.7 5.5-1.7s2.75 1.7 5.5 1.7 2.75-1.7 5.5-1.7 2.75 1.7 5.5 1.7M8 25.6c2 0 2-1.3 4-1.3s2 1.3 4 1.3 2-1.3 4-1.3 2 1.3 4 1.3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Логотип целиком: знак и название сайта строчными
export function Logo({ name, size = 32 }: { name: string; size?: number }) {
  return <><LogoMark size={size} /><span className="logo-t">{name}</span></>;
}
