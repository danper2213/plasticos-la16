"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/require-user";
import { createAdminClient } from "@/utils/supabase/admin";
import type { AppRole } from "@/utils/supabase/require-user";

export interface UserWithRole {
  id: string;
  email: string | null;
  role: AppRole;
  createdAt?: string;
}

export interface ListUsersResult {
  users: UserWithRole[];
  error?: string;
  /** ID del usuario actual (para deshabilitar eliminar sobre sí mismo en la UI). */
  currentUserId?: string;
}

/**
 * Lista usuarios de Auth con su rol en user_roles. Solo admin.
 * Si falta SUPABASE_SERVICE_ROLE_KEY, devuelve error para mostrar en la UI.
 */
export async function listUsersWithRoles(): Promise<ListUsersResult> {
  const { user: currentUser } = await requireAdmin();

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Clave de servicio no configurada.";
    return { users: [], error: msg };
  }

  const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    console.error("listUsersWithRoles:", listError);
    return { users: [], error: listError.message };
  }

  const userIds = authUsers.users.map((u) => u.id);
  if (userIds.length === 0) return { users: [], currentUserId: currentUser.id };

  const { data: roles } = await admin
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);

  const roleByUserId = new Map<string, string>();
  for (const r of roles ?? []) {
    if (r.role === "admin" || r.role === "employee") {
      roleByUserId.set(r.user_id, r.role);
    }
  }

  const users = authUsers.users.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    role: (roleByUserId.get(u.id) ?? "employee") as AppRole,
    createdAt: u.created_at,
  }));

  return { users, currentUserId: currentUser.id };
}

export type CreateUserResult =
  | { success: true; userId: string }
  | { success: false; error: string };

/**
 * Crea un usuario en Auth y le asigna rol en user_roles. Solo admin.
 */
export async function createUser(data: {
  email: string;
  password: string;
  role: AppRole;
}): Promise<CreateUserResult> {
  await requireAdmin();

  const email = data.email.trim().toLowerCase();
  const password = data.password;
  const role = data.role === "admin" ? "admin" : "employee";

  if (!email) {
    return { success: false, error: "El correo es obligatorio." };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Clave de servicio no configurada." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return { success: false, error: createError.message };
  }

  const userId = created.user.id;

  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    role,
  });

  if (roleError) {
    return { success: false, error: "Usuario creado pero falló asignar rol: " + roleError.message };
  }

  revalidatePath("/dashboard/usuarios");
  return { success: true, userId };
}

export type UpdateRoleResult = { success: true } | { success: false; error: string };

/**
 * Actualiza el rol de un usuario. Solo admin. No permite quitar el último admin.
 */
export async function updateUserRole(
  userId: string,
  newRole: AppRole
): Promise<UpdateRoleResult> {
  const { user } = await requireAdmin();

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Clave de servicio no configurada." };
  }

  const { data: roles } = await admin.from("user_roles").select("user_id, role");
  const admins = (roles ?? []).filter((r) => r.role === "admin");
  const isTargetAdmin = admins.some((r) => r.user_id === userId);
  if (isTargetAdmin && newRole === "employee" && admins.length <= 1) {
    return { success: false, error: "No puede quitar el único administrador." };
  }

  const { error } = await admin
    .from("user_roles")
    .update({ role: newRole })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/usuarios");
  return { success: true };
}

export type DeleteUserResult = { success: true } | { success: false; error: string };

/**
 * Elimina un usuario de Auth y su fila en user_roles. Solo admin.
 * No permite eliminarse a sí mismo ni eliminar al último admin.
 */
export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  const { user: currentUser } = await requireAdmin();

  if (userId === currentUser.id) {
    return { success: false, error: "No puede eliminarse a sí mismo." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Clave de servicio no configurada." };
  }

  const { data: roles } = await admin.from("user_roles").select("user_id, role");
  const admins = (roles ?? []).filter((r) => r.role === "admin");
  const isTargetAdmin = admins.some((r) => r.user_id === userId);
  if (isTargetAdmin && admins.length <= 1) {
    return { success: false, error: "No puede eliminar al único administrador." };
  }

  const { error: roleError } = await admin.from("user_roles").delete().eq("user_id", userId);
  if (roleError) {
    return { success: false, error: roleError.message };
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    return { success: false, error: authError.message };
  }

  revalidatePath("/dashboard/usuarios");
  return { success: true };
}
