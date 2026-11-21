"use server";

import { redirect } from "next/navigation";
import { readConfig } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Encerra a sessão (cookies) e volta para o login. */
export async function signOutAction() {
  if (readConfig().authMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login?saiu=1");
}
