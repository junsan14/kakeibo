import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: claimsData,
  } = await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub ?? null;

  if (userId) {
    redirect("/dashboard");
  }

  redirect("/login");
}