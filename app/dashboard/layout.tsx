import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { UserRole } from "@/components/layout/sidebar";
import { DashboardShell } from "@/components/layout/dashboard-shell";

async function getDashboardContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let role: UserRole = "employee";
  try {
    // Expects table: user_roles (user_id uuid, role text) with role in ('admin','employee')
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.role === "admin" || data?.role === "employee") {
      role = data.role;
    }
  } catch {
    // Default to employee if table missing or error
  }

  return { user, role };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await getDashboardContext();

  return (
    <DashboardShell userRole={role} userEmail={user.email ?? null}>
      {children}
    </DashboardShell>
  );
}
