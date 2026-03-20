import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);

    const tests = await prisma.testPack.findMany({
      include: {
        sections: { orderBy: { orderIndex: "asc" } },
        _count: { select: { attempts: true } },
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ tests });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["admin", "super_admin"]);
    const body = await req.json();

    const testPack = await prisma.testPack.create({
      data: {
        title: body.title,
        description: body.description,
        mode: body.mode || "full_mock",
        academicOrGeneral: body.academicOrGeneral || "academic",
        difficulty: body.difficulty || "medium",
        durationMinutes: body.durationMinutes || 170,
        publishedStatus: "draft",
        imageUrl: body.imageUrl,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: "create",
        entityType: "TestPack",
        entityId: testPack.id,
        newValueJson: JSON.stringify({ title: body.title }),
      },
    });

    return NextResponse.json({ testPack });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    console.error("Create test error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
