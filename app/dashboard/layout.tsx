import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import type { UserRole } from "@/components/layout/sidebar";

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
    <div className="min-h-screen bg-background">
      <Sidebar userRole={role} />
      <div className="lg:pl-64 min-h-screen bg-white dark:bg-[#121212]">
        <Header userEmail={user.email ?? null} userRole={role} />
        <main className="flex min-h-[calc(100vh-3.5rem)] flex-col overflow-auto p-4 lg:p-6">
          <div className="flex-1">{children}</div>
          <footer className="mt-auto rounded-t-2xl border-t border-border bg-card/80 backdrop-blur-sm px-4 py-5 md:px-8 md:py-6 shadow-[0_-1px_0_0_hsl(var(--border))]">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-6">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt=""
                  width={64}
                  height={26}
                  className="h-6 w-auto object-contain opacity-90"
                />
                <span className="text-sm font-semibold tracking-tight text-muted-foreground">
                  PLASTICOS <span className="text-primary">LA 16</span>
                </span>
              </div>
              <span className="text-xs text-muted-foreground/80">
                © {new Date().getFullYear()} Todos los derechos reservados
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
