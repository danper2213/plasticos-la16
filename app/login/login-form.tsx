"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { LogIn, Mail, Lock } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "@/app/actions/auth";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Ingrese un correo electrónico válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    const result = await signIn({
      email: values.email,
      password: values.password,
      redirectTo,
    });
    if (!result.success) {
      setSubmitError(result.error);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md"
    >
      <div className="overflow-hidden rounded-[24px] border border-border bg-card shadow-2xl dark:bg-zinc-950/95 dark:border-zinc-800">
        {/* Hero header — mismo patrón que formularios del dashboard (payable-form, etc.) */}
        <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border px-6 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
              <LogIn className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">
                Iniciar sesión
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ingrese su correo y contraseña para acceder al sistema.
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            <div className="space-y-5 p-6">
              {submitError && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                >
                  {submitError}
                </div>
              )}
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
                        placeholder="ejemplo@empresa.com"
                        autoComplete="email"
                        disabled={isSubmitting}
                        aria-invalid={fieldState.invalid}
                        className={inputClassName}
                        {...field}
                        value={(field.value as string) ?? ""}
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
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        aria-invalid={fieldState.invalid}
                        className={inputClassName}
                        {...field}
                        value={(field.value as string) ?? ""}
                      />
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="mt-2 w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="size-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Entrando…
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
}
