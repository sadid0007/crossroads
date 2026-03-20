import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const body = await req.json();

    const testPack = await prisma.testPack.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        mode: body.mode,
        academicOrGeneral: body.academicOrGeneral,
        difficulty: body.difficulty,
        durationMinutes: body.durationMinutes,
        imageUrl: body.imageUrl,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: "update",
        entityType: "TestPack",
        entityId: id,
      },
    });

    return NextResponse.json({ testPack });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["admin", "super_admin"]);
    const { id } = await params;

    await prisma.testPack.update({
      where: { id },
      data: { publishedStatus: "archived" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: "archive",
        entityType: "TestPack",
        entityId: id,
      },
    });

    return NextResponse.json({ archived: true });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
