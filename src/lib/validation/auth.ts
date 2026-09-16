import { z } from "zod";

export const emailSchema = z
  .string({ error: "E-mail is required" })
  .trim()
  .toLowerCase()
  .min(1, "E-mail is required")
  .max(254, "E-mail is too long")
  .pipe(z.email("Enter a valid e-mail address"));

export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Use at least 8 characters")
  .max(128, "Password is too long");

export const nameSchema = z.string().trim().min(1, "Name is required").max(80, "Name is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(128),
});

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "Choose a different password",
    path: ["newPassword"],
  });

export const profileSchema = z.object({
  name: nameSchema,
});

/** Only allow same-origin redirect targets. */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
