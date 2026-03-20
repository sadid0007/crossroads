"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatBand } from "@/lib/utils";

interface SectionResult {
  id: string;
  sectionType: string;
  status: string;
  rawScore?: number;
  bandEstimate?: number | null;
  totalQuestions?: number;
  correctCount?: number;
  timeSpentSeconds?: number | null;
  typeAccuracy?: Record<string, { total: number; correct: number; accuracy: number }>;
  answers?: {
    id: string;
    questionId: string;
    answerValue: string | null;
    isCorrect: boolean | null;
    correctAnswer?: string;
    explanation?: string | null;
    questionType: string;
    questionText: string;
    orderIndex: number;
  }[];
  submissions?: {
    id: string;
    taskNumber?: number;
    partNumber?: number;
    wordCount?: number;
    evaluationStatus: string;
    evaluation?: {
      overallBand: number | null;
      rubricBreakdown: Record<string, number> | null;
      feedbackText: string | null;
      improvementAreas: string[] | null;
    } | null;
  }[];
  evaluationStatus?: string;
}

interface ResultsData {
  attempt: {
    id: string;
    status: string;
    mode: string;
    startedAt: string | null;
    submittedAt: string | null;
  };
  testPack: {
    id: string;
    title: string;
    mode: string;
    academicOrGeneral: string;
    durationMinutes: number;
  };
  overallBand: number | null;
  scoreStatus: string;
  targetBand: number | null;
  sectionResults: SectionResult[];
  suggestions: string[];
}

export default function ResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/results/${params.attemptId}`);
        if (!res.ok) throw new Error("Failed to load results");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [params.attemptId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-red-600 mb-4">{error ?? "No results found"}</p>
        <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const { attempt, testPack, overallBand, scoreStatus, targetBand, sectionResults, suggestions } = data;

  const bandColor = (band: number | null | undefined) => {
    if (band == null) return "text-gray-400";
    if (band >= 7) return "text-green-600";
    if (band >= 5.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/history")}
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to History
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{testPack.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <Badge variant="info">{testPack.academicOrGeneral}</Badge>
            <Badge variant={scoreStatus === "final" ? "success" : "warning"}>
              {scoreStatus === "final" ? "Final Score" : scoreStatus === "provisional" ? "Provisional" : "Partial"}
            </Badge>
            <span>{attempt.mode === "simulation" ? "Simulation" : "Practice"}</span>
          </div>
        </div>
      </div>

      {/* Overall Band Score */}
      <Card>
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-2">Overall Band Score</p>
          <p className={cn("text-6xl font-bold", bandColor(overallBand))}>
            {overallBand != null ? formatBand(overallBand) : "--"}
          </p>
          {targetBand != null && (
            <p className="text-sm text-gray-500 mt-2">
              Target: {formatBand(targetBand)}
              {overallBand != null && (
                <span className={cn("ml-2 font-medium", overallBand >= targetBand ? "text-green-600" : "text-red-600")}>
                  ({overallBand >= targetBand ? "Target Met!" : `${formatBand(targetBand - overallBand)} below target`})
                </span>
              )}
            </p>
          )}
        </div>
      </Card>

      {/* Section Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {sectionResults.map((section) => (
          <Card key={section.id}>
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 capitalize mb-1">{section.sectionType}</p>
              <p className={cn("text-3xl font-bold", bandColor(section.bandEstimate))}>
                {section.bandEstimate != null ? formatBand(section.bandEstimate) : "--"}
              </p>
              {(section.sectionType === "listening" || section.sectionType === "reading") && section.totalQuestions != null && (
                <p className="text-xs text-gray-400 mt-1">
                  {section.correctCount ?? 0}/{section.totalQuestions} correct
                </p>
              )}
              {(section.sectionType === "writing" || section.sectionType === "speaking") && section.evaluationStatus && (
                <Badge
                  variant={section.evaluationStatus === "evaluated" ? "success" : "warning"}
                  className="mt-1"
                >
                  {section.evaluationStatus === "evaluated" ? "Evaluated" : "Pending"}
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Section Details */}
      {sectionResults.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              <CardTitle className="capitalize">{section.sectionType} Details</CardTitle>
              <svg
                className={cn("w-5 h-5 text-gray-400 transition-transform", expandedSection === section.id && "rotate-180")}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </CardHeader>

          {expandedSection === section.id && (
            <div className="space-y-4">
              {/* Question type accuracy for L/R */}
              {section.typeAccuracy && Object.keys(section.typeAccuracy).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Accuracy by Question Type</h4>
                  <div className="space-y-2">
                    {Object.entries(section.typeAccuracy)
                      .sort(([, a], [, b]) => a.accuracy - b.accuracy)
                      .map(([type, stats]) => (
                        <div key={type} className="flex items-center justify-between p-2 rounded bg-gray-50">
                          <span className="text-sm text-gray-700 capitalize">{type.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">{stats.correct}/{stats.total}</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={cn(
                                  "h-2 rounded-full",
                                  stats.accuracy >= 80 ? "bg-green-500" : stats.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${stats.accuracy}%` }}
                              />
                            </div>
                            <span className={cn(
                              "text-sm font-medium w-12 text-right",
                              stats.accuracy >= 80 ? "text-green-600" : stats.accuracy >= 50 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {stats.accuracy}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Answer review for L/R */}
              {section.answers && section.answers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Answer Review</h4>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {section.answers
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((answer) => (
                        <div
                          key={answer.id}
                          className={cn(
                            "flex items-start gap-3 p-2 rounded text-sm",
                            answer.isCorrect ? "bg-green-50" : "bg-red-50"
                          )}
                        >
                          <span className={cn(
                            "flex-shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center",
                            answer.isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                          )}>
                            {answer.isCorrect ? "✓" : "✗"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-800 truncate">{answer.questionText}</p>
                            <div className="flex items-center gap-4 mt-0.5 text-xs">
                              <span className="text-gray-500">Your answer: {answer.answerValue ?? "(blank)"}</span>
                              {!answer.isCorrect && answer.correctAnswer && (
                                <span className="text-green-700">Correct: {answer.correctAnswer}</span>
                              )}
                            </div>
                            {answer.explanation && (
                              <p className="text-xs text-gray-500 mt-1">{answer.explanation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Writing/Speaking submissions */}
              {section.submissions && section.submissions.length > 0 && (
                <div className="space-y-3">
                  {section.submissions.map((sub) => (
                    <div key={sub.id} className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {sub.taskNumber != null ? `Task ${sub.taskNumber}` : `Part ${sub.partNumber}`}
                        </span>
                        <Badge variant={sub.evaluationStatus === "evaluated" ? "success" : "warning"}>
                          {sub.evaluationStatus === "evaluated" ? "Evaluated" : "Pending Evaluation"}
                        </Badge>
                      </div>
                      {sub.wordCount != null && (
                        <p className="text-sm text-gray-500">Word count: {sub.wordCount}</p>
                      )}
                      {sub.evaluation && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Band Score:</span>
                            <span className={cn("text-lg font-bold", bandColor(sub.evaluation.overallBand))}>
                              {sub.evaluation.overallBand != null ? formatBand(sub.evaluation.overallBand) : "--"}
                            </span>
                          </div>
                          {sub.evaluation.rubricBreakdown && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {Object.entries(sub.evaluation.rubricBreakdown).map(([criterion, score]) => (
                                <div key={criterion} className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-gray-600 capitalize">{criterion.replace(/_/g, " ")}</span>
                                  <span className="font-medium">{typeof score === 'number' ? formatBand(score) : String(score)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {sub.evaluation.feedbackText && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-900">{sub.evaluation.feedbackText}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

      {/* Improvement Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Improvement Suggestions</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-200 text-yellow-800 text-xs font-medium flex items-center justify-center">
                  {idx + 1}
                </span>
                <p className="text-sm text-gray-800">{suggestion}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-center gap-4 pb-8">
        <Button variant="outline" onClick={() => router.push("/history")}>
          View All Tests
        </Button>
        <Button onClick={() => router.push("/tests")}>
          Take Another Test
        </Button>
      </div>
    </div>
  );
}
