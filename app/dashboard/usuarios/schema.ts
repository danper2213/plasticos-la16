import { z } from "zod";

const uuidSchema = z.string().uuid("Identificador no válido");

export const createUserSchema = z.object({
  email: z.string().trim().email("Ingrese un correo válido."),
  password: z.string().min(12, "Mínimo 12 caracteres."),
  role: z.enum(["admin", "employee"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userIdSchema = uuidSchema;

export const updateUserRoleSchema = z.object({
  userId: uuidSchema,
  newRole: z.enum(["admin", "employee"]),
});
