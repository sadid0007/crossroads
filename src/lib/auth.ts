import { cookies } from "next/headers";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const SESSION_COOKIE = "crossroads_session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = uuid();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("Forbidden");
  return user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}
