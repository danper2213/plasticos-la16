"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Lock, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { listUsersWithRoles, createUser, updateUserRole, deleteUser } from "./actions";
import type { UserWithRole } from "./actions";
import type { AppRole } from "@/utils/supabase/require-user";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

const createUserSchema = z.object({
  email: z.string().email("Ingrese un correo válido."),
  password: z.string().min(6, "Mínimo 6 caracteres."),
  role: z.enum(["admin", "employee"]),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface UsuariosClientProps {
  initialUsers: UserWithRole[];
  initialError?: string;
  currentUserId?: string;
}

export function UsuariosClient({ initialUsers, initialError, currentUserId }: UsuariosClientProps) {
  const router = useRouter();
  const [users, setUsers] = React.useState<UserWithRole[]>(initialUsers);
  const [error, setError] = React.useState<string | undefined>(initialError);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [userToDelete, setUserToDelete] = React.useState<UserWithRole | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", password: "", role: "employee" },
  });

  async function refetch() {
    const result = await listUsersWithRoles();
    if (result.users.length >= 0) setUsers(result.users);
    if (result.error) setError(result.error);
    else setError(undefined);
  }

  async function onSubmitCreate(values: CreateUserFormValues) {
    const result = await createUser({
      email: values.email,
      password: values.password,
      role: values.role as AppRole,
    });
    if (result.success) {
      toast.success("Usuario creado correctamente. Puede iniciar sesión con su correo y contraseña.");
      form.reset({ email: "", password: "", role: "employee" });
      setCreateOpen(false);
      await refetch();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleRoleChange(userId: string, newRole: AppRole) {
    setUpdatingId(userId);
    const result = await updateUserRole(userId, newRole);
    setUpdatingId(null);
    if (result.success) {
      toast.success("Rol actualizado.");
      await refetch();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    setDeletingId(userToDelete.id);
    const result = await deleteUser(userToDelete.id);
    setDeletingId(null);
    setUserToDelete(null);
    if (result.success) {
      toast.success("Usuario eliminado.");
      await refetch();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Cree usuarios y asigne rol de administrador o empleado.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-fit gap-2">
          <UserPlus className="size-4" />
          Crear usuario
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {error}
          <span className="block mt-1 text-muted-foreground">
            Añada <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> en{" "}
            <code className="rounded bg-muted px-1">.env.local</code> (Dashboard de Supabase → Settings → API).
          </span>
        </div>
      )}

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="w-[180px]">Cambiar rol</TableHead>
              <TableHead className="w-[80px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {error ? "Configure la clave de servicio para listar usuarios." : "No hay usuarios."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Administrador" : "Empleado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(value) => handleRoleChange(u.id, value as AppRole)}
                      disabled={!!updatingId}
                    >
                      <SelectTrigger className={inputClassName}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="employee">Empleado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={u.id === currentUserId || !!deletingId}
                      onClick={() => setUserToDelete(u)}
                      aria-label={`Eliminar a ${u.email ?? "usuario"}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente a <strong>{userToDelete?.email ?? "este usuario"}</strong>.
            Ya no podrá iniciar sesión. Esta acción no se puede deshacer.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          overlayClassName="bg-black/50 backdrop-blur-md"
          className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden dark:bg-zinc-950/95 dark:border-zinc-800"
          showCloseButton
        >
          <DialogTitle className="sr-only">Crear usuario</DialogTitle>
          <DialogDescription className="sr-only">
            Ingrese correo, contraseña y rol para el nuevo usuario.
          </DialogDescription>

          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border px-6 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <UserPlus className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Crear usuario
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  El usuario podrá iniciar sesión con su correo y contraseña.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="flex flex-col">
              <div className="p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                        Correo electrónico
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="usuario@empresa.com"
                          className={inputClassName}
                          {...field}
                          value={String(field.value ?? "")}
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="size-4 shrink-0 text-primary" aria-hidden />
                        Contraseña
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          className={inputClassName}
                          {...field}
                          value={String(field.value ?? "")}
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="size-4 shrink-0 text-primary" aria-hidden />
                        Rol
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                        <FormControl>
                          <SelectTrigger className={inputClassName}>
                            <SelectValue placeholder="Seleccione rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="employee">Empleado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="border-t border-border bg-muted/50 px-6 py-4 flex justify-end gap-2 rounded-b-[24px]">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg border-border hover:bg-muted"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="rounded-lg bg-primary hover:bg-primary/90 gap-2"
                >
                  {form.formState.isSubmitting ? "Creando…" : "Crear usuario"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
