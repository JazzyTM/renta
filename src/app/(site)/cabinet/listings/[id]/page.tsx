import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, isStaff } from "@/lib/auth";
import { ListingEditor } from "@/components/ListingEditor";
import { Promote } from "@/components/Promote";

export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser(`/cabinet/listings/${id}`);
  const l = await db.listing.findUnique({ where: { id }, select: { ownerId: true, title: true, status: true } });
  if (!l || (l.ownerId !== u.id && !isStaff(u.role))) notFound();
  return (
    <>
      <div className="small"><Link href="/cabinet">← Мои объекты</Link></div>
      <h1 className="h1">{l.title}</h1>
      <ListingEditor id={id} />
      {l.status === "PUBLISHED" && <Promote listingId={id} />}
    </>
  );
}
