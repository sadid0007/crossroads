import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireUser();
    const { sectionAttemptId, taskNumber, contentText, wordCount } = await req.json();

    const submission = await prisma.writingSubmission.upsert({
      where: { id: `${sectionAttemptId}_task${taskNumber}` },
      create: {
        id: `${sectionAttemptId}_task${taskNumber}`,
        sectionAttemptId,
        taskNumber,
        contentText,
        wordCount,
        evaluationStatus: "pending",
      },
      update: {
        contentText,
        wordCount,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ submission });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Writing submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
