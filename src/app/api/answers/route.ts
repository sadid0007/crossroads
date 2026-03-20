import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireUser();
    const { sectionAttemptId, answers } = await req.json();

    if (!sectionAttemptId || !answers) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Batch upsert answers
    const operations = Object.entries(answers).map(([questionId, value]) =>
      prisma.answer.upsert({
        where: {
          id: `${sectionAttemptId}_${questionId}`,
        },
        create: {
          id: `${sectionAttemptId}_${questionId}`,
          sectionAttemptId,
          questionId,
          answerValueJson: JSON.stringify(value),
          savedAt: new Date(),
        },
        update: {
          answerValueJson: JSON.stringify(value),
          savedAt: new Date(),
          version: { increment: 1 },
        },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ saved: true, count: operations.length });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Save answers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const sectionAttemptId = url.searchParams.get("sectionAttemptId");

    if (!sectionAttemptId) {
      return NextResponse.json({ error: "Missing sectionAttemptId" }, { status: 400 });
    }

    const answers = await prisma.answer.findMany({
      where: { sectionAttemptId },
    });

    const answerMap: Record<string, unknown> = {};
    for (const a of answers) {
      answerMap[a.questionId] = {
        value: a.answerValueJson ? JSON.parse(a.answerValueJson) : null,
        isFlagged: a.isFlagged,
        isCorrect: a.isCorrect,
      };
    }

    return NextResponse.json({ answers: answerMap });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
