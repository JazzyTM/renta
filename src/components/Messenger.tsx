import type { ChannelKind } from "@/lib/contacts";

// Значки мессенджеров (упрощённые, в фирменных цветах)
const BG: Record<ChannelKind, string> = { wa: "#25D366", tg: "#2AABEE", max: "#7B5CFF", vk: "#0077FF" };

export function MsgIcon({ kind, size = 20 }: { kind: ChannelKind; size?: number }) {
  return (
    <svg className="msg-i" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill={BG[kind]} />
      {kind === "wa" && <>
        <path d="M12 5.2a6.8 6.8 0 0 0-5.9 10.2L5.3 18.7l3.4-.8A6.8 6.8 0 1 0 12 5.2z" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9.6 9.3c.2-.4.4-.4.6-.4h.4c.1 0 .3 0 .4.3l.6 1.4c0 .2 0 .3-.1.4l-.4.5c-.1.1-.1.2 0 .4.4.7 1.2 1.5 2 1.9.2.1.3.1.4 0l.5-.6c.1-.1.3-.2.4-.1l1.4.7c.2.1.2.2.2.3 0 .4-.2 1.1-.9 1.3-.6.2-1.7.1-3.2-.8-1.3-.8-2.3-2-2.6-2.8-.3-.9-.2-1.7.3-2z" fill="#fff" />
      </>}
      {kind === "tg" && <path d="M5.2 11.6l12.3-4.8c.6-.2 1.1.1.9 1l-2.1 9.8c-.1.7-.6.8-1.1.5l-3.1-2.3-1.5 1.5c-.2.2-.3.3-.6.3l.2-3.2 5.8-5.2c.3-.2-.1-.4-.4-.2l-7.1 4.5-3.1-1c-.7-.2-.7-.6.2-.9z" fill="#fff" />}
      {kind === "max" && <path d="M6.5 16.5V7.8l5.5 5.4 5.5-5.4v8.7" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />}
      {kind === "vk" && <path d="M12.6 16.6c-4.6 0-7.2-3.1-7.3-8.3h2.3c.1 3.8 1.8 5.4 3.1 5.7V8.3h2.2v3.3c1.3-.1 2.6-1.6 3.1-3.3h2.1c-.4 2-1.9 3.5-3 4.1 1.1.5 2.8 1.8 3.5 4.2h-2.4c-.5-1.6-1.8-2.8-3.4-3v3h-.2z" fill="#fff" />}
    </svg>
  );
}
