export const metadata = { title: "Нет связи", robots: { index: false } };

export default function Offline() {
  return (
    <main className="wrap" style={{ paddingBlock: 60 }}>
      <div className="empty"><h1 className="h2">Нет интернета</h1><p className="muted">Проверьте связь и обновите страницу. Избранное сохранено на телефоне.</p></div>
    </main>
  );
}
