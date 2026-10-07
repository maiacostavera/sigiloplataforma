import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name: string };
  }
}

// Incremento 01: un único revisor definido por variables de entorno.
// En el incremento 02 esto pasa a la base.
async function verificar(email: string, clave: string) {
  const esperado = process.env.REVISOR_DEMO_EMAIL;
  const hash = process.env.REVISOR_DEMO_CLAVE_HASH;
  if (!esperado || !hash || email.toLowerCase() !== esperado.toLowerCase()) return null;
  if (!(await bcrypt.compare(clave, hash))) return null;
  return { id: "demo", email: esperado, name: "Revisor de prueba" };
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
