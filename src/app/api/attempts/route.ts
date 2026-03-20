import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { testPackId, mode } = await req.json();

    // Check for existing in-progress attempt (idempotent)
    const existing = await prisma.attempt.findFirst({
      where: { userId: user.id, testPackId, status: "in_progress" },
      include: { sectionAttempts: true },
    });

    if (existing) {
      return NextResponse.json({ attempt: existing });
    }

    // Get test pack with sections
    const testPack = await prisma.testPack.findUnique({
      where: { id: testPackId },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });

    if (!testPack) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Create attempt with section attempts
    const attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        testPackId,
        testPackVersionId: testPack.currentVersionId,
        status: "in_progress",
        mode: mode || "simulation",
        startedAt: new Date(),
        sectionAttempts: {
          create: testPack.sections.map((s) => ({
            sectionId: s.id,
            status: "not_started",
            timerRemainingSeconds: s.timerSeconds,
          })),
        },
      },
      include: { sectionAttempts: true },
    });

    return NextResponse.json({ attempt });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create attempt error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const testPackId = url.searchParams.get("testPackId");
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = { userId: user.id };
    if (testPackId) where.testPackId = testPackId;
    if (status) where.status = status;

    const attempts = await prisma.attempt.findMany({
      where,
      include: {
        testPack: { select: { title: true, mode: true } },
        sectionAttempts: {
          include: { section: { select: { type: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ attempts });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
