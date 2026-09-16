import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { ensureUserForIdentity } from "@/lib/services/user-identity";

/**
 * Authentication (Auth.js v5) with Google sign-in.
 *
 * - Sessions are JWTs in an encrypted cookie; no session tables are needed.
 * - On sign-in the Google profile is mapped to a row in our `users` table (by e-mail) and that
 *   row's id travels in the token, so every service keeps working with a plain `userId`.
 * - `AUTH_ALLOWED_EMAILS` (comma-separated) restricts who may sign in. Leave it empty to allow
 *   any Google account, each of which gets its own private data.
 * - When the Google credentials are absent the app falls back to a single local user, which
 *   keeps `npm run dev`, tests and CI working with zero configuration.
 */

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
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
  providers: isAuthConfigured()
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          authorization: { params: { prompt: "select_account" } },
        }),
      ]
    : [],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      return isEmailAllowed(user.email);
    },
    async jwt({ token, user }) {
      // `user` is only present on the sign-in request: map the identity to our users table.
      if (user?.email) {
        token.userId = await ensureUserForIdentity({ email: user.email, name: user.name, image: user.image });
        token.picture = user.image ?? token.picture;
        token.name = user.name ?? token.name;
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

/** The signed-in user for display purposes, or the local placeholder when auth is off. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isAuthConfigured()) return null;
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };
}
