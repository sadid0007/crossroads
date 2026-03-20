import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await requireRole(["evaluator", "admin", "super_admin"]);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");

    // Get pending writing submissions
    const writingWhere: Record<string, unknown> = {};
    if (status) writingWhere.evaluationStatus = status;
    if (user.role === "evaluator") writingWhere.assignedEvaluatorId = user.id;

    const writingSubmissions = await prisma.writingSubmission.findMany({
      where: writingWhere,
      include: {
        sectionAttempt: {
          include: {
            attempt: { include: { user: { select: { name: true, email: true } }, testPack: { select: { title: true } } } },
          },
        },
        evaluations: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const speakingSubmissions = await prisma.speakingSubmission.findMany({
      where: user.role === "evaluator" ? { assignedEvaluatorId: user.id } : {},
      include: {
        sectionAttempt: {
          include: {
            attempt: { include: { user: { select: { name: true, email: true } }, testPack: { select: { title: true } } } },
          },
        },
        audioAsset: true,
        evaluations: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      writing: type === "speaking" ? [] : writingSubmissions,
      speaking: type === "writing" ? [] : speakingSubmissions,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    console.error("Evaluations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["evaluator", "admin", "super_admin"]);
    const body = await req.json();
    const { submissionType, submissionId, rubricScores, overallBand, feedbackText, improvementAreas, status: evalStatus } = body;

    const evaluation = await prisma.evaluation.create({
      data: {
        submissionType,
        writingSubmissionId: submissionType === "writing" ? submissionId : null,
        speakingSubmissionId: submissionType === "speaking" ? submissionId : null,
        evaluatorId: user.id,
        rubricScoresJson: JSON.stringify(rubricScores),
        overallBand,
        feedbackText,
        improvementAreas: JSON.stringify(improvementAreas),
        status: evalStatus || "draft",
        finalizedAt: evalStatus === "finalized" ? new Date() : null,
      },
    });

    // Update submission status
    if (submissionType === "writing") {
      await prisma.writingSubmission.update({
        where: { id: submissionId },
        data: { evaluationStatus: evalStatus === "finalized" ? "evaluated" : "in_review" },
      });
    } else {
      await prisma.speakingSubmission.update({
        where: { id: submissionId },
        data: { evaluationStatus: evalStatus === "finalized" ? "evaluated" : "in_review" },
      });
    }

    return NextResponse.json({ evaluation });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    console.error("Create evaluation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
