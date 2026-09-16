"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { auth, isEmailAllowed, signIn, signOut } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isAppError } from "@/lib/errors";
import { createUserWithPassword, updateUserPassword, updateUserProfile, verifyUserPassword } from "@/lib/services/user-identity";
import { changePasswordSchema, loginSchema, profileSchema, registerSchema, safeRedirectPath } from "@/lib/validation/auth";
import { ZodError } from "zod";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  /** Echoed back so the form can keep what the user typed after an error. */
  values?: Record<string, string>;
}

const LOGIN_LIMIT = { limit: 10, windowMs: 15 * 60_000 };
const REGISTER_LIMIT = { limit: 5, windowMs: 60 * 60_000 };

function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

function stringValues(formData: FormData, keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    values[key] = typeof value === "string" ? value : "";
  }
  return values;
}

/** Sign in with e-mail + password. Redirects on success (Auth.js throws a redirect internally). */
export async function loginAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = stringValues(formData, ["email", "next"]);
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const limit = checkRateLimit(`login:${await clientKey()}:${parsed.data.email}`, LOGIN_LIMIT);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.`, values };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirectPath(formData.get("next")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect e-mail or password.", values };
    }
    throw error; // NEXT_REDIRECT on success
  }
  return {};
}

/** Create an account, then sign in and redirect to the dashboard. */
export async function registerAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = stringValues(formData, ["name", "email"]);
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  if (!isEmailAllowed(parsed.data.email)) {
    return { error: "Registration is limited to approved e-mail addresses.", values };
  }
  const limit = checkRateLimit(`register:${await clientKey()}`, REGISTER_LIMIT);
  if (!limit.ok) return { error: "Too many accounts created from this network. Try again later.", values };

  try {
    await createUserWithPassword({ name: parsed.data.name, email: parsed.data.email, password: parsed.data.password });
  } catch (error) {
    if (isAppError(error)) return { error: error.message, values };
    console.error("[auth] register failed", error);
    return { error: "Could not create the account. Please try again.", values };
  }

  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Account created, but sign-in failed. Please sign in.", values };
    throw error;
  }
  return {};
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function changePasswordAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to continue." };
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  if (!(await verifyUserPassword(session.user.id, parsed.data.currentPassword))) {
    return { fieldErrors: { currentPassword: "Current password is incorrect" } };
  }
  await updateUserPassword(session.user.id, parsed.data.newPassword);
  return { success: "Password updated." };
}

export async function updateProfileAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to continue." };
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: stringValues(formData, ["name"]) };
  const profile = await updateUserProfile(session.user.id, parsed.data);
  return { success: "Profile updated.", values: { name: profile.name ?? "" } };
}
