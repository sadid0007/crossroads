import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sectionAttemptId: string }> }
) {
  try {
    const user = await requireUser();
    const { sectionAttemptId } = await params;

    const sectionAttempt = await prisma.sectionAttempt.findUnique({
      where: { id: sectionAttemptId },
      include: {
        attempt: {
          select: {
            id: true,
            userId: true,
            status: true,
            testPackId: true,
            testPack: {
              select: { id: true, title: true },
            },
          },
        },
        section: {
          select: {
            id: true,
            type: true,
            orderIndex: true,
            timerSeconds: true,
            passagesOrPrompts: {
              select: {
                id: true,
                title: true,
                contentHtml: true,
                orderIndex: true,
                paragraphAnchors: true,
                asset: {
                  select: {
                    id: true,
                    url: true,
                    type: true,
                    mimeType: true,
                  },
                },
                questionGroups: {
                  select: {
                    id: true,
                    title: true,
                    instructionsText: true,
                    orderIndex: true,
                    partNumber: true,
                  },
                  orderBy: { orderIndex: "asc" },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
            questionGroups: {
              select: {
                id: true,
                title: true,
                instructionsText: true,
                orderIndex: true,
                partNumber: true,
                linkedPassageOrPromptId: true,
                questions: {
                  select: {
                    id: true,
                    type: true,
                    text: true,
                    optionsJson: true,
                    answerSchemaJson: true,
                    answerVariantsJson: true,
                    explanationText: true,
                    marks: true,
                    orderIndex: true,
                    audioTimestamp: true,
                    imageUrl: true,
                    groupId: true,
                  },
                  orderBy: { orderIndex: "asc" },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                text: true,
                optionsJson: true,
                answerSchemaJson: true,
                answerVariantsJson: true,
                explanationText: true,
                marks: true,
                orderIndex: true,
                audioTimestamp: true,
                imageUrl: true,
                groupId: true,
              },
            },
          },
          orderBy: { question: { orderIndex: "asc" } },
        },
      },
    });

    if (!sectionAttempt) {
      return NextResponse.json(
        { error: "Section attempt not found" },
        { status: 404 }
      );
    }

    // Authorization: only the attempt owner or admin/evaluator
    if (
      sectionAttempt.attempt.userId !== user.id &&
      !["admin", "super_admin", "evaluator"].includes(user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow review for submitted sections
    if (!["submitted", "evaluated"].includes(sectionAttempt.status)) {
      return NextResponse.json(
        { error: "Section has not been submitted yet" },
        { status: 400 }
      );
    }

    const sectionType = sectionAttempt.section.type;

    // Build a map from questionId -> answer
    const answerMap = new Map(
      sectionAttempt.answers.map((a) => [a.questionId, a])
    );

    // Flatten all questions from question groups, ordered
    const allQuestions = sectionAttempt.section.questionGroups
      .flatMap((qg) =>
        qg.questions.map((q) => ({
          ...q,
          groupTitle: qg.title,
          groupInstructions: qg.instructionsText,
          partNumber: qg.partNumber,
          linkedPassageOrPromptId: qg.linkedPassageOrPromptId,
        }))
      )
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // Build review items
    const questions = allQuestions.map((q, index) => {
      const answer = answerMap.get(q.id);
      return {
        number: index + 1,
        id: q.id,
        type: q.type,
        text: q.text,
        optionsJson: q.optionsJson,
        imageUrl: q.imageUrl,
        marks: q.marks,
        orderIndex: q.orderIndex,
        audioTimestamp: q.audioTimestamp,
        groupTitle: q.groupTitle,
        groupInstructions: q.groupInstructions,
        partNumber: q.partNumber,
        linkedPassageOrPromptId: q.linkedPassageOrPromptId,
        correctAnswer: q.answerSchemaJson,
        answerVariants: q.answerVariantsJson,
        explanation: q.explanationText,
        studentAnswer: answer?.answerValueJson ?? null,
        isCorrect: answer?.isCorrect ?? null,
        isFlagged: answer?.isFlagged ?? false,
        timeSpentSeconds: answer?.timeSpentSeconds ?? null,
      };
    });

    // Passage data for reading sections
    const passages = sectionAttempt.section.passagesOrPrompts.map((p) => ({
      id: p.id,
      title: p.title,
      contentHtml: p.contentHtml,
      orderIndex: p.orderIndex,
      paragraphAnchors: p.paragraphAnchors,
      audioUrl:
        p.asset && (p.asset.type === "audio" || p.asset.mimeType?.startsWith("audio"))
          ? p.asset.url
          : null,
      questionGroupIds: p.questionGroups.map((qg) => qg.id),
    }));

    // Score summary
    const totalQuestions = questions.length;
    const answeredCount = questions.filter((q) => q.studentAnswer !== null).length;
    const correctCount = questions.filter((q) => q.isCorrect === true).length;
    const incorrectCount = questions.filter((q) => q.isCorrect === false).length;
    const unansweredCount = totalQuestions - answeredCount;

    return NextResponse.json({
      sectionAttempt: {
        id: sectionAttempt.id,
        status: sectionAttempt.status,
        rawScore: sectionAttempt.rawScore,
        bandScoreEstimate: sectionAttempt.bandScoreEstimate,
        timeSpentSeconds: sectionAttempt.timeSpentSeconds,
        startedAt: sectionAttempt.startedAt,
        submittedAt: sectionAttempt.submittedAt,
      },
      attempt: {
        id: sectionAttempt.attempt.id,
        testPackId: sectionAttempt.attempt.testPackId,
        testPackTitle: sectionAttempt.attempt.testPack.title,
      },
      sectionType,
      scoreSummary: {
        totalQuestions,
        answeredCount,
        correctCount,
        incorrectCount,
        unansweredCount,
        accuracy:
          answeredCount > 0
            ? Math.round((correctCount / answeredCount) * 100)
            : 0,
      },
      questions,
      passages,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Review fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
