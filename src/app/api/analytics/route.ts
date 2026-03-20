import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "student";

    if (type === "admin") {
      await requireRole(["admin", "super_admin"]);

      const [totalUsers, totalAttempts, totalTests, pendingEvals, recentAttempts] = await Promise.all([
        prisma.user.count({ where: { role: "student" } }),
        prisma.attempt.count(),
        prisma.testPack.count({ where: { publishedStatus: "published" } }),
        prisma.writingSubmission.count({ where: { evaluationStatus: "pending" } }),
        prisma.attempt.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true } },
            testPack: { select: { title: true } },
          },
        }),
      ]);

      // Completion rate
      const completedAttempts = await prisma.attempt.count({ where: { status: "submitted" } });
      const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;

      return NextResponse.json({
        totalUsers,
        totalAttempts,
        totalTests,
        pendingEvals,
        completionRate: Math.round(completionRate),
        recentAttempts,
      });
    }

    // Student analytics
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [attempts, performances] = await Promise.all([
      prisma.attempt.findMany({
        where: { userId: user.id },
        include: {
          testPack: { select: { title: true, mode: true } },
          sectionAttempts: {
            include: { section: { select: { type: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.questionTypePerformance.findMany({
        where: { userId: user.id },
        orderBy: { accuracyPercentage: "asc" },
      }),
    ]);

    // Build trend data
    const trendData = attempts
      .filter((a) => a.overallBandEstimate !== null)
      .map((a) => ({
        date: a.createdAt,
        band: a.overallBandEstimate,
        testTitle: a.testPack.title,
      }))
      .reverse();

    // Weakest areas
    const weakAreas = performances.slice(0, 5).map((p) => ({
      type: p.questionType,
      tag: p.subSkillTag,
      accuracy: p.accuracyPercentage,
      attempted: p.totalAttempted,
    }));

    return NextResponse.json({
      totalAttempts: attempts.length,
      completedAttempts: attempts.filter((a) => a.status === "submitted" || a.status === "evaluated").length,
      trendData,
      weakAreas,
      targetBand: user.targetBand,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
