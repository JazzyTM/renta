"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LoginForm, RegisterForm } from "./AuthForms";

// Вход и регистрация в окне, без ухода со страницы
export function AuthModal({ onClose, social }: { onClose: () => void; social: { vk: boolean; ya: boolean } }) {
  const [tab, setTab] = useState<"login" | "reg">("login");
  const path = usePathname();
  const next = typeof window !== "undefined" ? path + location.search : path;
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; }; }, [onClose]);
  const q = `?next=${encodeURIComponent(next)}`;
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal stack" role="dialog" aria-modal="true" aria-label="Вход" onMouseDown={e => e.stopPropagation()}>
        <button className="x" aria-label="Закрыть" onClick={onClose}>×</button>
        <div className="tabs"><button className={tab === "login" ? "on" : ""} onClick={() => setTab("login")}>Вход</button><button className={tab === "reg" ? "on" : ""} onClick={() => setTab("reg")}>Регистрация</button></div>
        {(social.vk || social.ya) && <div className="social">
          {social.vk && <a className="btn ghost wide" href={`/auth/vk${q}`}>Войти через ВКонтакте</a>}
          {social.ya && <a className="btn ghost wide" href={`/auth/yandex${q}`}>Войти через Яндекс ID</a>}
          <div className="or">или по почте</div></div>}
        {tab === "login" ? <LoginForm next={next} /> : <RegisterForm next={next} />}
      </div>
    </div>
  );
}
