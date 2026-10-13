// Рисунки вместо фото: шапка главной, плитки курортов, статьи и объявления без фото.
// Плоские цвета, без градиентов. Вариант рисунка выбирается по названию, чтобы плитки отличались.

const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

const PAL = [
  { sky: "#8EC5DD", sun: "#FFD08A", far: "#6FA3BC", near: "#4C8A6E", sea: "#2F7DA6", acc: "#FF7043" },
  { sky: "#F4C7A6", sun: "#FF8A65", far: "#C99393", near: "#7E6B8F", sea: "#3D6E99", acc: "#FF5722" },
  { sky: "#A9D8E6", sun: "#FFE08A", far: "#7DB8C9", near: "#5C9A7B", sea: "#1F8FB0", acc: "#FF7043" },
  { sky: "#B7D3E9", sun: "#FFC27A", far: "#8DA9C4", near: "#5B7C99", sea: "#2B5F86", acc: "#E64A19" },
];

function Waves({ y0, n = 3, color = "#fff", op = 0.35 }: { y0: number; n?: number; color?: string; op?: number }) {
  return <g stroke={color} strokeOpacity={op} strokeWidth="2.5" strokeLinecap="round" fill="none">
    {Array.from({ length: n }, (_, i) => { const y = y0 + i * 16, x = 30 + ((i * 97) % 260); return <path key={i} d={`M${x} ${y} q8 -5 16 0 t16 0 M${x + 120} ${y + 6} q8 -5 16 0 t16 0`} />; })}
  </g>;
}

const Gulls = ({ x, y }: { x: number; y: number }) => (
  <g stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeOpacity=".8">
    <path d={`M${x} ${y} q6 -6 12 0 q6 -6 12 0`} /><path d={`M${x + 34} ${y - 12} q5 -5 10 0 q5 -5 10 0`} />
  </g>
);

// Сцена для плитки курорта или обложки статьи
export function SceneArt({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed), v = h % 6, p = PAL[(h >>> 4) % PAL.length], sx = 270 + (h >>> 8) % 90;
  let body: React.ReactNode;
  if (v === 0) body = <>
    <path d="M0 170 L60 110 L105 150 L170 78 L240 150 L290 112 L400 172 V240 H0Z" fill={p.far} />
    <path d="M0 192 L80 152 L150 186 L230 160 L320 190 L400 168 V240 H0Z" fill={p.near} />
    <rect y="196" width="400" height="44" fill={p.sea} /><Waves y0={208} n={2} />
  </>;
  else if (v === 1) body = <>
    <rect y="170" width="400" height="70" fill={p.sea} /><Waves y0={186} n={3} />
    <path d="M311 104 L60 150 L60 176 Z" fill="#fff" fillOpacity=".18" />
    <path d="M240 240 L262 192 L298 182 L332 194 L362 186 L400 200 V240Z" fill={p.near} />
    <path d="M296 184 L303 110 L319 110 L326 184Z" fill="#fff" />
    <path d="M300 150 L322 150 L323.6 164 L298.4 164Z M302.5 124 L319.5 124 L320.8 136 L301.2 136Z" fill={p.acc} />
    <rect x="301" y="96" width="20" height="14" fill="#FFD08A" /><path d="M297 97 L311 84 L325 97Z" fill={p.acc} />
  </>;
  else if (v === 2) body = <>
    <rect y="150" width="400" height="60" fill={p.sea} /><Waves y0={164} n={2} />
    <path d="M0 200 Q200 178 400 206 V240 H0Z" fill="#E9D3A6" />
    <path d="M300 208 Q294 162 312 120" stroke="#6B4B2E" strokeWidth="7" fill="none" strokeLinecap="round" />
    <g stroke={p.near} strokeWidth="9" fill="none" strokeLinecap="round">
      <path d="M312 120 Q282 104 256 126" /><path d="M312 120 Q340 100 366 118" /><path d="M312 120 Q300 92 280 86" /><path d="M312 120 Q330 92 350 92" /><path d="M312 120 Q318 140 330 154" />
    </g>
  </>;
  else if (v === 3) body = <>
    <rect y="160" width="400" height="80" fill={p.sea} /><Waves y0={182} n={3} />
    <path d="M250 162 L292 140 L352 146 L400 132 V164 H250Z" fill={p.far} />
    <path d="M0 240 V104 L40 96 L92 118 L124 160 L150 210 L170 240Z" fill={p.near} />
    <path d="M40 96 L92 118 L70 132 L30 120Z" fill="#fff" fillOpacity=".12" />
  </>;
  else if (v === 4) body = <>
    <rect y="140" width="400" height="50" fill={p.sea} /><Waves y0={154} n={2} />
    <rect y="186" width="400" height="54" fill="#EBD9B0" />
    <path d="M290 150 L290 206" stroke="#555" strokeWidth="3" />
    <path d="M248 156 Q290 118 332 156Z" fill={p.acc} /><path d="M276 156 Q290 124 304 156Z" fill="#fff" />
    <rect x="200" y="206" width="56" height="16" rx="3" fill="#fff" /><rect x="200" y="211" width="56" height="5" fill={p.acc} />
  </>;
  else body = <>
    <rect y="150" width="400" height="90" fill={p.sea} /><Waves y0={200} n={3} />
    <path d="M168 176 L252 176 L240 190 L180 190Z" fill="#fff" />
    <path d="M212 172 L212 92 L254 168Z" fill="#fff" /><path d="M207 172 L207 108 L176 168Z" fill="#fff" fillOpacity=".85" />
    <path d="M150 150 L0 150 M400 150 L262 150" stroke={p.far} strokeWidth="2" />
  </>;
  return (
    <svg className={`art ${className ?? ""}`} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="240" fill={p.sky} />
      <circle cx={sx} cy={v === 1 ? 60 : 70} r="26" fill={p.sun} />
      {v !== 1 && <Gulls x={90 + (h >>> 12) % 80} y={58} />}
      {body}
    </svg>
  );
}

// Шапка главной без фото: горы, закатное солнце, море, парусник. Рисунок прижат к низу шапки.
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="360" fill="#2B5B78" />
      <path d="M0 236 L120 186 L210 214 L340 160 L470 216 L560 196 L700 236 L820 196 L930 222 L1040 182 L1180 230 L1300 200 L1440 226 V360 H0Z" fill="#336A8A" />
      <path d="M0 262 L160 230 L300 256 L460 236 L620 262 L760 242 L900 260 L1080 238 L1260 258 L1440 240 V360 H0Z" fill="#24526D" />
      <circle cx="1010" cy="268" r="42" fill="#FF8A50" />
      <rect y="266" width="1440" height="94" fill="#1D465E" />
      <path d="M970 282 H1050 M950 298 H1070 M985 314 H1035" stroke="#FF8A50" strokeOpacity=".5" strokeWidth="4" strokeLinecap="round" />
      <g stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M80 300 q12 -7 24 0 t24 0 M420 322 q12 -7 24 0 t24 0 M620 292 q12 -7 24 0 t24 0 M760 330 q12 -7 24 0 t24 0 M900 300 q12 -7 24 0 t24 0 M1100 326 q12 -7 24 0 t24 0 M1220 300 q12 -7 24 0 t24 0 M560 344 q12 -7 24 0 t24 0" />
      </g>
      <g transform="translate(220 262)">
        <path d="M0 30 L70 30 L60 42 L10 42Z" fill="#fff" />
        <path d="M36 27 L36 -38 L72 24Z" fill="#fff" /><path d="M32 27 L32 -24 L6 24Z" fill="#fff" fillOpacity=".85" />
      </g>
      <g transform="translate(690 312) scale(.6)">
        <path d="M0 30 L70 30 L60 42 L10 42Z" fill="#fff" />
        <path d="M36 27 L36 -38 L72 24Z" fill="#fff" /><path d="M32 27 L32 -24 L6 24Z" fill="#fff" fillOpacity=".85" />
      </g>
      <g stroke="#fff" strokeOpacity=".6" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M690 150 q8 -8 16 0 q8 -8 16 0" /><path d="M736 134 q6 -6 12 0 q6 -6 12 0" />
      </g>
    </svg>
  );
}

// Объявление без фото: домик у моря линиями
export function HouseArt() {
  return (
    <svg className="house-art" viewBox="0 0 200 150" aria-hidden="true">
      <g fill="none" stroke="#B9BEC6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M58 104 V66 L100 36 L142 66 V104" /><path d="M48 72 L100 34 L152 72" />
        <rect x="88" y="78" width="24" height="26" /><rect x="66" y="74" width="14" height="14" /><rect x="120" y="74" width="14" height="14" />
        <path d="M30 116 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#9CC3D8" />
        <path d="M50 130 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0" stroke="#9CC3D8" />
        <circle cx="160" cy="34" r="10" stroke="#FFB59C" />
      </g>
    </svg>
  );
}

// Баннер для хозяев без фото: дом и ключ
export function OwnersArt() {
  return (
    <svg className="owners-art" viewBox="0 0 320 220" aria-hidden="true">
      <rect x="40" y="96" width="170" height="110" fill="#3A4049" />
      <path d="M24 104 L125 30 L226 104Z" fill="#FF5722" />
      <rect x="108" y="140" width="34" height="66" fill="#FFD08A" />
      <rect x="62" y="122" width="30" height="30" fill="#8EC5DD" /><rect x="160" y="122" width="30" height="30" fill="#8EC5DD" />
      <g transform="rotate(-30 262 150)">
        <circle cx="262" cy="150" r="22" fill="none" stroke="#FFD08A" strokeWidth="10" />
        <path d="M262 172 V214 M262 196 H276 M262 208 H272" stroke="#FFD08A" strokeWidth="10" strokeLinecap="round" />
      </g>
    </svg>
  );
}
