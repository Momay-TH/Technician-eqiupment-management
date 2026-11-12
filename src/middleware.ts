import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const handleI18n = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const locale = routing.locales.includes(maybeLocale as never)
    ? maybeLocale
    : routing.defaultLocale;

  const isLogin = pathname === `/${locale}/login` || pathname === "/login";
  const isDemo = pathname === `/${locale}/demo` || pathname.startsWith(`/${locale}/demo/`);
  const hasSession = request.cookies.has("session");

  if (!hasSession && !isLogin && !isDemo) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (hasSession && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Bare locale root (e.g. /th) -> dashboard (or login when signed out).
  if (segments.length === 1) {
    const url = request.nextUrl.clone();
    url.pathname = hasSession ? `/${locale}/dashboard` : `/${locale}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return handleI18n(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
