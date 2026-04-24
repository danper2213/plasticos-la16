"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { AlertCircle, LogIn, Lock, Mail } from "lucide-react";
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
import { AnimatePresence, motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Ingrese un correo electrónico válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const inputClassName =
  "rounded-lg h-10 border-input/80 bg-background/80 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary transition-[border-color,box-shadow,background-color] duration-200 dark:border-zinc-700/80 dark:bg-zinc-900/50";

const easeOut = [0.16, 1, 0.3, 1] as const;

type LoginFormProps = {
  reduceMotion?: boolean;
};

export function LoginForm({ reduceMotion = false }: LoginFormProps) {
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
    <motion.div layout className="w-full max-w-md">
      <motion.div
        layout
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: easeOut }}
        whileHover={
          reduceMotion
            ? undefined
            : { y: -2, transition: { type: "spring", stiffness: 400, damping: 28 } }
        }
        className="group/card relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-2xl shadow-black/10 ring-1 ring-black/5 backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-950/75 dark:shadow-black/40 dark:ring-white/5"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent opacity-100 transition-opacity duration-500 group-hover/card:from-primary/[0.11] dark:from-blue-500/10 dark:group-hover/card:from-blue-500/14" />

        <div className="relative border-b border-border/70 bg-gradient-to-br from-primary/12 via-card/50 to-transparent px-6 py-5 dark:border-zinc-800/70 dark:from-blue-950/50 dark:via-zinc-900/40 dark:to-transparent">
          <div className="flex items-center gap-3">
            <motion.div
              className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner shadow-primary/10 dark:bg-blue-500/20 dark:text-blue-400"
              whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <LogIn className="size-6" />
            </motion.div>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="relative flex flex-col">
            <motion.div
              className="space-y-5 p-6"
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: reduceMotion ? 0 : 0.06,
                    delayChildren: reduceMotion ? 0 : 0.05,
                  },
                },
              }}
            >
              <AnimatePresence mode="wait">
                {submitError && (
                  <motion.div
                    key={submitError}
                    role="alert"
                    initial={
                      reduceMotion
                        ? false
                        : { opacity: 0, y: -8, scale: 0.96, filter: "blur(4px)" }
                    }
                    animate={
                      reduceMotion
                        ? { opacity: 1, y: 0, scale: 1 }
                        : {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            filter: "blur(0px)",
                            x: [0, -10, 10, -8, 8, -4, 4, 0],
                          }
                    }
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.18 } }
                    }
                    transition={{
                      opacity: { duration: reduceMotion ? 0.12 : 0.22, ease: easeOut },
                      y: { duration: reduceMotion ? 0.12 : 0.22, ease: easeOut },
                      scale: { duration: reduceMotion ? 0.12 : 0.22, ease: easeOut },
                      filter: { duration: reduceMotion ? 0 : 0.25 },
                      x: { duration: reduceMotion ? 0 : 0.48, ease: "easeInOut" },
                    }}
                    className="flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive shadow-[0_0_0_1px_hsl(var(--destructive)/0.12)] dark:border-destructive/40 dark:bg-destructive/15"
                  >
                    <motion.span
                      className="mt-0.5 shrink-0 text-destructive"
                      aria-hidden
                      initial={reduceMotion ? false : { scale: 0.5, rotate: -25 }}
                      animate={
                        reduceMotion
                          ? { scale: 1, rotate: 0 }
                          : {
                              scale: [1, 1.12, 1],
                              rotate: [0, -6, 6, -4, 4, 0],
                            }
                      }
                      transition={{
                        duration: reduceMotion ? 0 : 0.55,
                        ease: easeOut,
                        delay: reduceMotion ? 0 : 0.08,
                      }}
                    >
                      <AlertCircle className="size-5" strokeWidth={2.25} />
                    </motion.span>
                    <span className="min-w-0 flex-1 leading-snug">{submitError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
                    }}
                  >
                    <FormItem className="group/field">
                      <FormLabel className="flex items-center gap-2 text-muted-foreground transition-colors group-focus-within/field:text-foreground">
                        <Mail
                          className="size-4 shrink-0 text-primary/80 transition-colors group-focus-within/field:text-primary"
                          aria-hidden
                        />
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
                  </motion.div>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
                    }}
                  >
                    <FormItem className="group/field">
                      <FormLabel className="flex items-center gap-2 text-muted-foreground transition-colors group-focus-within/field:text-foreground">
                        <Lock
                          className="size-4 shrink-0 text-primary/80 transition-colors group-focus-within/field:text-primary"
                          aria-hidden
                        />
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
                  </motion.div>
                )}
              />
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
                }}
                className="pt-1"
              >
                <Button
                  type="submit"
                  className="mt-1 h-11 w-full rounded-lg shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/35"
                  disabled={isSubmitting}
                >
                  <motion.span
                    className="inline-flex w-full items-center justify-center gap-2"
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
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
                  </motion.span>
                </Button>
              </motion.div>
            </motion.div>
          </form>
        </Form>
      </motion.div>
    </motion.div>
  );
}
