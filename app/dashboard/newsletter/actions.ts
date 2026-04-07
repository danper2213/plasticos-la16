"use server";

import { requireAdmin } from "@/utils/supabase/require-user";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export async function getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as NewsletterSubscriber[];
}
