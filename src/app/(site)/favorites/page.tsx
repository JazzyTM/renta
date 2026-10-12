import { FavList } from "@/components/FavList";

export const metadata = { title: "Избранное", robots: { index: false } };

export default function Favorites() {
  return (
    <main className="wrap" style={{ paddingBlock: 24 }}>
      <h1 className="h1" style={{ marginBottom: 18 }}>Избранное</h1>
      <FavList />
    </main>
  );
}
