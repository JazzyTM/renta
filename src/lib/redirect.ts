import { NextResponse } from "next/server";

/** Перенаправление на путь этого же сайта. Адрес относительный: за nginx req.url — это внутренний
 *  http://localhost:3000, и абсолютная ссылка из него уводила бы человека на localhost. */
export function localRedirect(path: string, status = 307) {
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return new NextResponse(null, { status, headers: { Location: safe } });
}
