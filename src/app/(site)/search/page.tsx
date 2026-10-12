import { ResultsPage } from "@/components/ResultsPage";

export const metadata = { title: "Поиск жилья у моря" };

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, any>> }) {
  return <ResultsPage title="Жильё у моря" scope={{}} action="/search" sp={await searchParams} />;
}
