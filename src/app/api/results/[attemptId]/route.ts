import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  getRawToBand,
  calculateOverallBand,
  DEFAULT_LISTENING_BAND_MAP,
  DEFAULT_READING_BAND_MAP,
} from "@/lib/scoring";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const user = await requireUser();
    const { attemptId } = await params;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        testPack: {
          select: {
            id: true,
            title: true,
            mode: true,
            academicOrGeneral: true,
            durationMinutes: true,
            imageUrl: true,
          },
        },
        sectionAttempts: {
          include: {
            section: {
              select: {
                id: true,
                type: true,
                orderIndex: true,
                timerSeconds: true,
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
                    groupId: true,
                  },
                },
              },
              orderBy: { savedAt: "asc" },
            },
            writingSubmissions: {
              include: {
                evaluations: {
                  where: { status: "finalized" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
              orderBy: { taskNumber: "asc" },
            },
            speakingSubmissions: {
              include: {
                evaluations: {
                  where: { status: "finalized" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
              orderBy: { partNumber: "asc" },
            },
          },
          orderBy: { section: { orderIndex: "asc" } },
        },
        user: {
          select: { id: true, targetBand: true },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Only allow the owner or admin/evaluator to view results
    if (
      attempt.userId !== user.id &&
      !["admin", "super_admin", "evaluator"].includes(user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only return correct answers for submitted/evaluated attempts
    const isSubmitted = ["submitted", "evaluated"].includes(attempt.status);

    // Get custom scoring configs if available
    const scoringConfigs = await prisma.scoringConfig.findMany({
      where: { testPackId: attempt.testPackId, isActive: true },
    });

    const listeningConfig = scoringConfigs.find(
      (c) => c.sectionType === "listening"
    );
    const readingConfig = scoringConfigs.find(
      (c) => c.sectionType === "reading"
    );
    const listeningBandMap = listeningConfig
      ? JSON.parse(listeningConfig.rawToBandMap)
      : DEFAULT_LISTENING_BAND_MAP;
    const readingBandMap = readingConfig
      ? JSON.parse(readingConfig.rawToBandMap)
      : DEFAULT_READING_BAND_MAP;

    // Build section results
    const sectionResults = attempt.sectionAttempts.map((sa) => {
      const sectionType = sa.section.type;

      if (sectionType === "listening" || sectionType === "reading") {
        // Calculate per-question-type accuracy
        const typeAccuracy: Record<
          string,
          { total: number; correct: number; accuracy: number }
        > = {};

        const answers = sa.answers.map((answer) => {
          const qType = answer.question.type;
          if (!typeAccuracy[qType]) {
            typeAccuracy[qType] = { total: 0, correct: 0, accuracy: 0 };
          }
          typeAccuracy[qType].total += 1;
          if (answer.isCorrect) {
            typeAccuracy[qType].correct += 1;
          }

          return {
            id: answer.id,
            questionId: answer.questionId,
            answerValue: answer.answerValueJson,
            isCorrect: answer.isCorrect,
            isFlagged: answer.isFlagged,
            ...(isSubmitted && {
              correctAnswer: answer.question.answerSchemaJson,
              explanation: answer.question.explanationText,
            }),
            questionType: answer.question.type,
            questionText: answer.question.text,
            orderIndex: answer.question.orderIndex,
          };
        });

        // Compute accuracy percentages
        for (const key of Object.keys(typeAccuracy)) {
          typeAccuracy[key].accuracy =
            typeAccuracy[key].total > 0
              ? Math.round(
                  (typeAccuracy[key].correct / typeAccuracy[key].total) * 100
                )
              : 0;
        }

        const bandMap =
          sectionType === "listening" ? listeningBandMap : readingBandMap;
        const rawScore = sa.rawScore ?? 0;
        const bandEstimate =
          sa.bandScoreEstimate ?? getRawToBand(rawScore, bandMap);

        return {
          id: sa.id,
          sectionType,
          status: sa.status,
          rawScore,
          bandEstimate,
          totalQuestions: sa.answers.length,
          correctCount: sa.answers.filter((a) => a.isCorrect).length,
          timeSpentSeconds: sa.timeSpentSeconds,
          typeAccuracy,
          answers: isSubmitted ? answers : undefined,
        };
      }

      if (sectionType === "writing") {
        const submissions = sa.writingSubmissions.map((ws) => {
          const evaluation = ws.evaluations[0];
          let rubricBreakdown = null;
          if (evaluation) {
            try {
              rubricBreakdown = JSON.parse(evaluation.rubricScoresJson);
            } catch {
              rubricBreakdown = null;
            }
          }
          return {
            id: ws.id,
            taskNumber: ws.taskNumber,
            wordCount: ws.wordCount,
            evaluationStatus: ws.evaluationStatus,
            evaluation: evaluation
              ? {
                  overallBand: evaluation.overallBand,
                  rubricBreakdown,
                  feedbackText: evaluation.feedbackText,
                  improvementAreas: evaluation.improvementAreas
                    ? JSON.parse(evaluation.improvementAreas)
                    : null,
                }
              : null,
          };
        });

        // Calculate writing band from evaluations
        const evaluatedBands = submissions
          .filter((s) => s.evaluation?.overallBand != null)
          .map((s) => s.evaluation!.overallBand as number);
        const writingBand =
          evaluatedBands.length > 0
            ? calculateOverallBand(evaluatedBands)
            : null;

        return {
          id: sa.id,
          sectionType,
          status: sa.status,
          bandEstimate: sa.bandScoreEstimate ?? writingBand,
          timeSpentSeconds: sa.timeSpentSeconds,
          submissions,
          evaluationStatus:
            submissions.every((s) => s.evaluationStatus === "evaluated")
              ? "evaluated"
              : submissions.some((s) => s.evaluationStatus === "in_review")
                ? "in_review"
                : "pending",
        };
      }

      if (sectionType === "speaking") {
        const submissions = sa.speakingSubmissions.map((ss) => {
          const evaluation = ss.evaluations[0];
          let rubricBreakdown = null;
          if (evaluation) {
            try {
              rubricBreakdown = JSON.parse(evaluation.rubricScoresJson);
            } catch {
              rubricBreakdown = null;
            }
          }
          return {
            id: ss.id,
            partNumber: ss.partNumber,
            durationSeconds: ss.durationSeconds,
            evaluationStatus: ss.evaluationStatus,
            evaluation: evaluation
              ? {
                  overallBand: evaluation.overallBand,
                  rubricBreakdown,
                  feedbackText: evaluation.feedbackText,
                  improvementAreas: evaluation.improvementAreas
                    ? JSON.parse(evaluation.improvementAreas)
                    : null,
                }
              : null,
          };
        });

        const evaluatedBands = submissions
          .filter((s) => s.evaluation?.overallBand != null)
          .map((s) => s.evaluation!.overallBand as number);
        const speakingBand =
          evaluatedBands.length > 0
            ? calculateOverallBand(evaluatedBands)
            : null;

        return {
          id: sa.id,
          sectionType,
          status: sa.status,
          bandEstimate: sa.bandScoreEstimate ?? speakingBand,
          timeSpentSeconds: sa.timeSpentSeconds,
          submissions,
          evaluationStatus:
            submissions.every((s) => s.evaluationStatus === "evaluated")
              ? "evaluated"
              : submissions.some((s) => s.evaluationStatus === "in_review")
                ? "in_review"
                : "pending",
        };
      }

      return {
        id: sa.id,
        sectionType,
        status: sa.status,
      };
    });

    // Compute overall band
    const sectionBands = sectionResults
      .filter((s) => s.bandEstimate != null)
      .map((s) => s.bandEstimate as number);
    const overallBand =
      sectionBands.length > 0
        ? calculateOverallBand(sectionBands)
        : attempt.overallBandEstimate;

    // Determine score status
    const allSectionsEvaluated = sectionResults.every((s) => {
      if (s.sectionType === "listening" || s.sectionType === "reading") {
        return s.status === "submitted";
      }
      return (
        "evaluationStatus" in s && s.evaluationStatus === "evaluated"
      );
    });

    const scoreStatus = allSectionsEvaluated
      ? "final"
      : sectionBands.length === sectionResults.length
        ? "provisional"
        : "partial";

    // Generate improvement suggestions
    const suggestions: string[] = [];
    for (const section of sectionResults) {
      if (
        (section.sectionType === "listening" ||
          section.sectionType === "reading") &&
        "typeAccuracy" in section &&
        section.typeAccuracy
      ) {
        const weakTypes = Object.entries(section.typeAccuracy)
          .filter(([, stats]) => stats.accuracy < 60)
          .sort(([, a], [, b]) => a.accuracy - b.accuracy);
        for (const [qType, stats] of weakTypes.slice(0, 2)) {
          const typeName = qType.replace(/_/g, " ");
          suggestions.push(
            `Focus on ${section.sectionType} ${typeName} questions (${stats.accuracy}% accuracy). Practice identifying key patterns for this question type.`
          );
        }
      }
      if (
        (section.sectionType === "writing" ||
          section.sectionType === "speaking") &&
        "submissions" in section
      ) {
        for (const sub of section.submissions ?? []) {
          if (sub.evaluation?.improvementAreas) {
            const areas = Array.isArray(sub.evaluation.improvementAreas)
              ? sub.evaluation.improvementAreas
              : [];
            for (const area of areas.slice(0, 2)) {
              suggestions.push(
                typeof area === "string"
                  ? area
                  : `Improve ${section.sectionType}: ${JSON.stringify(area)}`
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        mode: attempt.mode,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        createdAt: attempt.createdAt,
      },
      testPack: attempt.testPack,
      overallBand,
      scoreStatus,
      targetBand: attempt.user.targetBand,
      sectionResults,
      suggestions: suggestions.slice(0, 5),
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
    console.error("Results fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
