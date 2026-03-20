import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { checkAnswer, getRawToBand, DEFAULT_LISTENING_BAND_MAP, DEFAULT_READING_BAND_MAP } from "@/lib/scoring";
import { parseJson } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    await requireUser();
    const { sectionAttemptId, answers: incomingAnswers } = await req.json();

    const sectionAttempt = await prisma.sectionAttempt.findUnique({
      where: { id: sectionAttemptId },
      include: {
        section: {
          include: {
            questionGroups: {
              include: { questions: true },
            },
            testPack: {
              include: { scoringConfigs: { where: { isActive: true } } },
            },
          },
        },
        attempt: true,
      },
    });

    if (!sectionAttempt) {
      return NextResponse.json({ error: "Section attempt not found" }, { status: 404 });
    }

    // Save any final answers
    if (incomingAnswers) {
      const ops = Object.entries(incomingAnswers).map(([questionId, value]) =>
        prisma.answer.upsert({
          where: { id: `${sectionAttemptId}_${questionId}` },
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
      await prisma.$transaction(ops);
    }

    const sectionType = sectionAttempt.section.type;

    // Auto-score for listening and reading
    if (sectionType === "listening" || sectionType === "reading") {
      const allQuestions = sectionAttempt.section.questionGroups.flatMap((g) => g.questions);
      const savedAnswers = await prisma.answer.findMany({
        where: { sectionAttemptId },
      });

      let rawScore = 0;
      const answerUpdates = [];

      for (const answer of savedAnswers) {
        const question = allQuestions.find((q) => q.id === answer.questionId);
        if (!question) continue;

        const studentAnswer = answer.answerValueJson ? JSON.parse(answer.answerValueJson) : "";
        const correctAnswer = parseJson(question.answerSchemaJson, "");
        const variants = parseJson<string[]>(question.answerVariantsJson, []);
        const rules = parseJson(question.validationRules, {});

        const isCorrect = checkAnswer(studentAnswer, correctAnswer, variants, rules);
        if (isCorrect) rawScore += question.marks;

        answerUpdates.push(
          prisma.answer.update({
            where: { id: answer.id },
            data: { isCorrect },
          })
        );
      }

      await prisma.$transaction(answerUpdates);

      // Get band mapping
      const scoringConfig = sectionAttempt.section.testPack.scoringConfigs.find(
        (c) => c.sectionType === sectionType
      );
      const bandMap = scoringConfig
        ? parseJson(scoringConfig.rawToBandMap, sectionType === "listening" ? DEFAULT_LISTENING_BAND_MAP : DEFAULT_READING_BAND_MAP)
        : sectionType === "listening" ? DEFAULT_LISTENING_BAND_MAP : DEFAULT_READING_BAND_MAP;

      const bandScore = getRawToBand(rawScore, bandMap);

      await prisma.sectionAttempt.update({
        where: { id: sectionAttemptId },
        data: {
          status: "submitted",
          submittedAt: new Date(),
          rawScore,
          bandScoreEstimate: bandScore,
        },
      });

      // Update question type performance
      const user = sectionAttempt.attempt;
      for (const answer of savedAnswers) {
        const question = allQuestions.find((q) => q.id === answer.questionId);
        if (!question) continue;
        const tags = parseJson<string[]>(question.subSkillTags, []);
        const isCorrect = answer.isCorrect ?? false;

        for (const tag of [question.type, ...tags]) {
          await prisma.questionTypePerformance.upsert({
            where: { id: `${user.userId}_${tag}` },
            create: {
              id: `${user.userId}_${tag}`,
              userId: user.userId,
              questionType: question.type,
              subSkillTag: tag,
              totalAttempted: 1,
              totalCorrect: isCorrect ? 1 : 0,
              accuracyPercentage: isCorrect ? 100 : 0,
              lastUpdatedAt: new Date(),
            },
            update: {
              totalAttempted: { increment: 1 },
              totalCorrect: { increment: isCorrect ? 1 : 0 },
              lastUpdatedAt: new Date(),
            },
          });
        }
      }

      return NextResponse.json({
        submitted: true,
        rawScore,
        bandScore,
        totalQuestions: allQuestions.length,
      });
    }

    // For writing and speaking, just mark as submitted
    await prisma.sectionAttempt.update({
      where: { id: sectionAttemptId },
      data: { status: "submitted", submittedAt: new Date() },
    });

    return NextResponse.json({ submitted: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Submit section error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
