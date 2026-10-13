import { CompareTable } from "@/components/CompareTable";

export const metadata = { title: "Сравнение", robots: { index: false } };

export default function Compare() {
  return <main className="gray"><div className="wrap" style={{ paddingTop: 24 }}><h1 className="h1" style={{ marginBottom: 18 }}>Сравнение</h1><CompareTable /></div></main>;
}
