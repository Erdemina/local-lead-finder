import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: string;
      tenantId?: string | null;
    } & DefaultSession['user']; // includes name, email, image
  }

  interface User extends DefaultUser {
    id: string;
    role?: string;
    tenantId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
    tenantId?: string | null;
  }
}
