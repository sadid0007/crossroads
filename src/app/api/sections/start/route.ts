import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireUser();
    const { sectionAttemptId } = await req.json();

    const sectionAttempt = await prisma.sectionAttempt.findUnique({
      where: { id: sectionAttemptId },
      include: { section: true },
    });

    if (!sectionAttempt) {
      return NextResponse.json({ error: "Section attempt not found" }, { status: 404 });
    }

    if (sectionAttempt.status === "not_started") {
      await prisma.sectionAttempt.update({
        where: { id: sectionAttemptId },
        data: {
          status: "in_progress",
          startedAt: new Date(),
          timerRemainingSeconds: sectionAttempt.section.timerSeconds,
        },
      });
    }

    return NextResponse.json({
      started: true,
      timerSeconds: sectionAttempt.timerRemainingSeconds || sectionAttempt.section.timerSeconds,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
