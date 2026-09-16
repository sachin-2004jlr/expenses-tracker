import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateUser } from "@/lib/services/user-identity";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Authentication (Auth.js v5) with e-mail + password accounts.
 *
 * - Passwords are hashed with scrypt (`lib/password.ts`); accounts live in our `users` table.
 * - Sessions are JWTs in an encrypted, HttpOnly cookie; no session tables are needed.
 * - `AUTH_SECRET` signs the cookie. In development a fixed fallback keeps `npm run dev` working
 *   with zero setup; production refuses to start without a real secret.
 * - `AUTH_ALLOWED_EMAILS` (comma-separated) optionally restricts who may register.
 */

const DEV_FALLBACK_SECRET = "expenses-tracker-development-only-secret";

export function getAuthSecret(): string | null {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  return process.env.NODE_ENV === "production" ? null : DEV_FALLBACK_SECRET;
}

/** Human-readable configuration problem, or null when sign-in can work. */
export function authSetupError(): string | null {
  return getAuthSecret() ? null : "AUTH_SECRET is not set. Generate one with `npx auth secret` and add it to the environment.";
}

export function allowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = allowedEmails();
  return list.length === 0 || list.includes(email.trim().toLowerCase());
}

const config: NextAuthConfig = {
  secret: getAuthSecret() ?? undefined,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const account = await authenticateUser(parsed.data.email, parsed.data.password);
        if (!account) return null;
        return { id: account.id, email: account.email, name: account.name, image: account.image };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // `user` is only present on the sign-in request.
      if (user?.id) {
        token.userId = user.id;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        token.picture = user.image ?? token.picture;
      }
      // Allow the client to refresh the name after a profile update (session.update()).
      if (trigger === "update" && session && typeof session === "object" && "name" in session) {
        token.name = (session as { name?: string }).name ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string") session.user.id = token.userId;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

/** The signed-in user for display purposes, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!getAuthSecret()) return null;
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };
}
