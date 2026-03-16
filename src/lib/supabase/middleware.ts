import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = ["/login"];

/** Middleware: solo anon key. RLS vale per le richieste autenticate. */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL("/login", request.nextUrl));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Record<string, string | number | boolean | Date>)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!isPublicRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
  if (isPublicRoute && user) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return response;
}
