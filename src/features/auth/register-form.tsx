"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction, type AuthFormState } from "./actions";
import { FieldError, FormAlert } from "./login-form";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-glow-brand transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.99] disabled:opacity-70"
    >
      {pending ? "Creating account…" : "Create account"}
      {!pending && <ArrowRight className="size-4" aria-hidden />}
    </button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(registerAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="mt-6 grid gap-4" noValidate data-testid="register-form">
      <FormAlert message={state.error} />
      <div className="grid gap-1.5">
        <Label htmlFor="reg-name">Name</Label>
        <Input id="reg-name" name="name" autoComplete="name" required defaultValue={state.values?.name ?? ""} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "reg-name-error" : undefined} className="h-11" />
        <FieldError id="reg-name-error" message={errors.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="reg-email">E-mail</Label>
        <Input id="reg-email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email ?? ""} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "reg-email-error" : undefined} className="h-11" />
        <FieldError id="reg-email-error" message={errors.email} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <Input id="reg-password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "reg-password-error" : "reg-password-hint"} className="h-11" />
          <FieldError id="reg-password-error" message={errors.password} />
          {!errors.password && (
            <p id="reg-password-hint" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reg-confirm">Confirm password</Label>
          <Input id="reg-confirm" name="confirmPassword" type="password" autoComplete="new-password" required aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "reg-confirm-error" : undefined} className="h-11" />
          <FieldError id="reg-confirm-error" message={errors.confirmPassword} />
        </div>
      </div>
      <SubmitButton />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
