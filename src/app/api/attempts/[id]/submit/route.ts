import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { calculateOverallBand } from "@/lib/scoring";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        sectionAttempts: { include: { section: true } },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Calculate overall band from scored sections
    const scoredSections = attempt.sectionAttempts.filter(
      (sa) => sa.bandScoreEstimate !== null
    );
    const hasPendingEval = attempt.sectionAttempts.some(
      (sa) => sa.section.type === "writing" || sa.section.type === "speaking"
    );

    let overallBand: number | null = null;
    if (scoredSections.length > 0) {
      overallBand = calculateOverallBand(
        scoredSections.map((sa) => sa.bandScoreEstimate!)
      );
    }

    await prisma.attempt.update({
      where: { id },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        overallBandEstimate: overallBand,
        finalScoreStatus: hasPendingEval ? "partial" : "final",
      },
    });

    return NextResponse.json({
      submitted: true,
      overallBand,
      scoreStatus: hasPendingEval ? "partial" : "final",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
