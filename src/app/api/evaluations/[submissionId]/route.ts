import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    await requireRole(["evaluator", "admin", "super_admin"]);
    const { submissionId } = await params;
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "writing";

    if (type === "writing") {
      const ws = await prisma.writingSubmission.findUnique({
        where: { id: submissionId },
        include: {
          sectionAttempt: {
            include: {
              attempt: {
                include: {
                  user: { select: { name: true } },
                  testPack: { select: { title: true } },
                },
              },
            },
          },
          evaluations: {
            where: { status: "finalized" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!ws) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const eval_ = ws.evaluations[0];
      return NextResponse.json({
        submission: {
          id: ws.id,
          type: "writing",
          studentName: ws.sectionAttempt.attempt.user.name,
          testTitle: ws.sectionAttempt.attempt.testPack.title,
          taskNumber: ws.taskNumber,
          contentText: ws.contentText,
          wordCount: ws.wordCount,
          existingEvaluation: eval_
            ? {
                rubricScores: JSON.parse(eval_.rubricScoresJson),
                overallBand: eval_.overallBand,
                feedbackText: eval_.feedbackText,
                improvementAreas: eval_.improvementAreas
                  ? JSON.parse(eval_.improvementAreas)
                  : [],
              }
            : null,
        },
      });
    }

    // Speaking
    const ss = await prisma.speakingSubmission.findUnique({
      where: { id: submissionId },
      include: {
        sectionAttempt: {
          include: {
            attempt: {
              include: {
                user: { select: { name: true } },
                testPack: { select: { title: true } },
              },
            },
          },
        },
        audioAsset: true,
        evaluations: {
          where: { status: "finalized" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!ss) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const eval_ = ss.evaluations[0];
    return NextResponse.json({
      submission: {
        id: ss.id,
        type: "speaking",
        studentName: ss.sectionAttempt.attempt.user.name,
        testTitle: ss.sectionAttempt.attempt.testPack.title,
        partNumber: ss.partNumber,
        audioUrl: ss.audioAsset?.url ?? null,
        transcriptText: ss.transcriptText,
        existingEvaluation: eval_
          ? {
              rubricScores: JSON.parse(eval_.rubricScoresJson),
              overallBand: eval_.overallBand,
              feedbackText: eval_.feedbackText,
              improvementAreas: eval_.improvementAreas
                ? JSON.parse(eval_.improvementAreas)
                : [],
            }
          : null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    console.error("Fetch submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
