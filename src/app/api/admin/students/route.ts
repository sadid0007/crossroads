import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);

    const students = await prisma.user.findMany({
      where: { role: "student" },
      select: {
        id: true,
        name: true,
        email: true,
        targetBand: true,
        createdAt: true,
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ students });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
