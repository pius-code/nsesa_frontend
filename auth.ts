import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        worker_email: { label: "Email", type: "email" },
        worker_password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const res = await fetch(`${API_URL}/api/v1/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              worker_email: credentials.worker_email,
              worker_password: credentials.worker_password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();

          return {
            id: data.worker.id,
            name: data.worker.worker_name,
            email: data.worker.worker_email,
            accessToken: data.access_token,
            worker_role: data.worker.worker_role,
            worker_name: data.worker.worker_name,
            worker_shop_name: data.worker.worker_shop_name,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.worker_role = user.worker_role;
        token.worker_name = user.worker_name;
        token.worker_shop_name = user.worker_shop_name;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.worker_role = token.worker_role as string;
      session.user.worker_name = token.worker_name as string;
      session.user.worker_shop_name = token.worker_shop_name as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
