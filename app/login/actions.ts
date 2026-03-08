"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type LoginActionResult =
  | { success: true }
  | { success: false; error: string };

export async function signIn(formData: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<LoginActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const redirectTo = formData.redirectTo ?? "/dashboard";
  redirect(redirectTo);
}
