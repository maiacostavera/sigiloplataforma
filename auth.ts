import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, t } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name: string };
  }
}

async function verificar(email: string, clave: string) {
  const [r] = await db
    .select({ id: t.revisor.id, email: t.revisor.email, nombre: t.revisor.nombre, hash: t.revisorCredencial.claveHash })
    .from(t.revisor)
    .innerJoin(t.revisorCredencial, eq(t.revisorCredencial.revisorId, t.revisor.id))
    .where(eq(sql`lower(${t.revisor.email})`, email.toLowerCase()));
  // Se compara siempre, exista o no el mail, para no revelar cuáles existen por el tiempo de respuesta.
  const ok = await bcrypt.compare(clave, r?.hash ?? "$2b$12$000000000000000000000uGGsKuQZ0ixVu6IhCgSqQNHM9sD5k1S");
  if (!r || !ok) return null;
  return { id: r.id, email: r.email, name: r.nombre };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, clave: {} },
      async authorize(c) {
        const email = String(c?.email ?? "").trim();
        const clave = String(c?.clave ?? "");
        if (!email || !clave) throw new CredentialsSignin();
        const r = await verificar(email, clave);
        if (!r) throw new CredentialsSignin();
        return r;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
