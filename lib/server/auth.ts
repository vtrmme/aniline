import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/server/auth-options";
import { esOwner } from "@/lib/security";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  if (session.user.isAdmin === true) return true;
  return esOwner(session.user.id ?? null, session.user.email ?? null);
}