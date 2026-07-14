import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSession(request) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Supabaseの環境変数が設定されていません。"
    );

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            }
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  /*
   * 未ログイン時はdataがnullになる場合があるため、
   * 安全に取得する。
   */
  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const claims =
    claimsData?.claims ?? null;

  const pathname =
    request.nextUrl.pathname;

  const isLoggedIn =
    Boolean(claims?.sub);

  const isProtectedRoute =
    pathname.startsWith("/dashboard");

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup";

  /*
   * 未ログイン時のAuthSessionMissingErrorなどは
   * 正常な未ログイン状態として扱う。
   */
  if (
    claimsError &&
    claimsError.name !== "AuthSessionMissingError"
  ) {
    console.error(
      "Supabase認証確認エラー:",
      claimsError.message
    );
  }

  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    loginUrl.searchParams.set(
      "error",
      "ログインしてください。"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  if (isLoggedIn && isAuthRoute) {
    const dashboardUrl =
      request.nextUrl.clone();

    dashboardUrl.pathname =
      "/dashboard";

    dashboardUrl.search = "";

    return NextResponse.redirect(
      dashboardUrl
    );
  }

  return response;
}