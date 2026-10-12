import { CardSkeleton } from "./ListingCard";

export function ResultsSkeleton() {
  return (
    <main>
      <div className="sbar"><div className="wrap"><div className="sk" style={{ height: 76, borderRadius: 22 }} /></div></div>
      <div className="wrap"><div className="results">
        <aside className="fside"><div className="sk" style={{ height: 420, borderRadius: 18 }} /></aside>
        <section><div className="sk" style={{ height: 28, width: 260, marginBottom: 18 }} />
          <div className="rlist">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div></section>
      </div></div>
    </main>
  );
}

export function DetailSkeleton() {
  return (
    <main className="wrap" style={{ paddingBlock: 24 }}>
      <div className="sk" style={{ height: 36, width: "50%", marginBottom: 16 }} />
      <div className="sk" style={{ height: 380, borderRadius: 18 }} />
      <div className="detail"><div className="dmain"><div className="sk" style={{ height: 80 }} /><div className="sk" style={{ height: 200 }} /></div><div className="sk" style={{ height: 320, borderRadius: 18 }} /></div>
    </main>
  );
}

export function PanelSkeleton() {
  return <div className="stack"><div className="sk" style={{ height: 34, width: 280 }} /><div className="stats">{Array.from({ length: 4 }, (_, i) => <div key={i} className="sk" style={{ height: 84, borderRadius: 18 }} />)}</div><div className="sk" style={{ height: 320, borderRadius: 18 }} /></div>;
}
