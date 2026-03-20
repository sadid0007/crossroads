import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");
    const type = url.searchParams.get("type");

    const where: Record<string, unknown> = { publishedStatus: "published" };
    if (mode) where.mode = mode;
    if (type) where.academicOrGeneral = type;

    const tests = await prisma.testPack.findMany({
      where,
      include: {
        sections: { select: { id: true, type: true, timerSeconds: true, orderIndex: true }, orderBy: { orderIndex: "asc" } },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // If user is logged in, get their attempt statuses
    const attemptStatuses: Record<string, string> = {};
    if (user) {
      const attempts = await prisma.attempt.findMany({
        where: { userId: user.id },
        select: { testPackId: true, status: true },
        orderBy: { createdAt: "desc" },
      });
      for (const a of attempts) {
        if (!attemptStatuses[a.testPackId]) {
          attemptStatuses[a.testPackId] = a.status;
        }
      }
    }

    return NextResponse.json({
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        mode: t.mode,
        academicOrGeneral: t.academicOrGeneral,
        difficulty: t.difficulty,
        durationMinutes: t.durationMinutes,
        imageUrl: t.imageUrl,
        sections: t.sections,
        attemptCount: t._count.attempts,
        userStatus: attemptStatuses[t.id] || null,
      })),
    });
  } catch (error) {
    console.error("Tests list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
