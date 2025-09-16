import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' as const },
  providers: [ GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }) ],
  callbacks: {
    async session({ session, user }: any) {
      (session as any).userId = user.id; return session;
    },
    async signIn({ user }: any) {
      const exists = await prisma.twin.findUnique({ where: { userId: user.id } });
      if (!exists) await prisma.twin.create({ data: { userId: user.id, style: 'חם', interests: [] } });
      return true;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
} as any;

export const { handlers: { GET, POST }, auth } = NextAuth(authOptions);
