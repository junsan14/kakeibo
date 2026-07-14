import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(next) {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//")
  ) {
    return "/dashboard";
  }

  return next;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get("type");

  const next = getSafeNextPath(
    requestUrl.searchParams.get("next")
  );

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

    if (!error) {
      return NextResponse.redirect(
        new URL(next, request.url)
      );
    }
  }

  const loginUrl = new URL(
    "/login",
    request.url
  );

  loginUrl.searchParams.set(
    "error",
    "メール確認に失敗しました。リンクの期限が切れている可能性があります。"
  );

  return NextResponse.redirect(loginUrl);
}