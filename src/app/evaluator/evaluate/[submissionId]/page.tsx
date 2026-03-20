"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, formatBand } from "@/lib/utils";

const WRITING_CRITERIA = [
  { key: "task_achievement", label: "Task Achievement" },
  { key: "coherence_cohesion", label: "Coherence & Cohesion" },
  { key: "lexical_resource", label: "Lexical Resource" },
  { key: "grammatical_range", label: "Grammatical Range & Accuracy" },
];

const SPEAKING_CRITERIA = [
  { key: "fluency_coherence", label: "Fluency & Coherence" },
  { key: "lexical_resource", label: "Lexical Resource" },
  { key: "grammatical_range", label: "Grammatical Range & Accuracy" },
  { key: "pronunciation", label: "Pronunciation" },
];

interface SubmissionDetail {
  id: string;
  type: "writing" | "speaking";
  studentName: string;
  testTitle: string;
  taskNumber?: number;
  partNumber?: number;
  contentText?: string;
  wordCount?: number;
  audioUrl?: string;
  transcriptText?: string;
  existingEvaluation?: {
    rubricScores: Record<string, number>;
    overallBand: number | null;
    feedbackText: string | null;
    improvementAreas: string[];
  } | null;
}

export default function EvaluatePage() {
  const params = useParams<{ submissionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const submissionType = (searchParams.get("type") ?? "writing") as "writing" | "speaking";

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const criteria = submissionType === "writing" ? WRITING_CRITERIA : SPEAKING_CRITERIA;
  const [rubricScores, setRubricScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [improvements, setImprovements] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchSubmission() {
      try {
        const res = await fetch(`/api/evaluations/${params.submissionId}?type=${submissionType}`);
        if (res.ok) {
          const data = await res.json();
          setSubmission(data.submission);
          if (data.submission?.existingEvaluation) {
            const eval_ = data.submission.existingEvaluation;
            const scores: Record<string, string> = {};
            for (const [key, val] of Object.entries(eval_.rubricScores ?? {})) {
              scores[key] = String(val);
            }
            setRubricScores(scores);
            setFeedback(eval_.feedbackText ?? "");
            setImprovements((eval_.improvementAreas ?? []).join("\n"));
          }
        } else {
          setError("Failed to load submission");
        }
      } catch {
        setError("Failed to load submission");
      } finally {
        setLoading(false);
      }
    }
    fetchSubmission();
  }, [params.submissionId, submissionType]);

  const overallBand = useCallback(() => {
    const scores = Object.values(rubricScores).map(Number).filter((n) => !isNaN(n) && n > 0);
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 2) / 2;
  }, [rubricScores]);

  const handleSave = async (finalize: boolean) => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const scores: Record<string, number> = {};
      for (const [key, val] of Object.entries(rubricScores)) {
        const n = parseFloat(val);
        if (!isNaN(n)) scores[key] = n;
      }

      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: params.submissionId,
          submissionType,
          rubricScoresJson: JSON.stringify(scores),
          overallBand: overallBand(),
          feedbackText: feedback || null,
          improvementAreas: improvements
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          status: finalize ? "finalized" : "draft",
        }),
      });

      if (!res.ok) throw new Error("Failed to save evaluation");
      setSaved(true);
      if (finalize) {
        router.push("/evaluator/submissions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => router.push("/evaluator/submissions")}>Back</Button>
      </div>
    );
  }

  const band = overallBand();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={() => router.push("/evaluator/submissions")}
        className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Submissions
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Evaluate {submissionType === "writing" ? "Writing" : "Speaking"}
          </h1>
          {submission && (
            <p className="text-gray-500 mt-1">
              {submission.studentName} &middot; {submission.testTitle}
              {submission.taskNumber != null && ` &middot; Task ${submission.taskNumber}`}
              {submission.partNumber != null && ` &middot; Part ${submission.partNumber}`}
            </p>
          )}
        </div>
        {band != null && (
          <div className="text-center">
            <p className="text-xs text-gray-500">Overall Band</p>
            <p className="text-3xl font-bold text-blue-600">{formatBand(band)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission content */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {submissionType === "writing" ? "Student Response" : "Recording"}
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {submission?.contentText && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {submission.contentText}
                  </p>
                  {submission.wordCount != null && (
                    <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-200">
                      Word count: {submission.wordCount}
                    </p>
                  )}
                </div>
              )}
              {submission?.audioUrl && (
                <audio controls src={submission.audioUrl} className="w-full" />
              )}
              {submission?.transcriptText && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-2">Transcript</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {submission.transcriptText}
                  </p>
                </div>
              )}
              {!submission?.contentText && !submission?.audioUrl && (
                <p className="text-gray-400 text-center py-8">No content available</p>
              )}
            </div>
          </Card>
        </div>

        {/* Evaluation form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rubric Scores</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {criteria.map((c) => (
                <div key={c.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {c.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="9"
                      step="0.5"
                      value={rubricScores[c.key] ?? "0"}
                      onChange={(e) =>
                        setRubricScores((prev) => ({ ...prev, [c.key]: e.target.value }))
                      }
                      className="flex-1"
                    />
                    <span className={cn(
                      "text-lg font-bold w-10 text-center",
                      parseFloat(rubricScores[c.key] ?? "0") >= 7
                        ? "text-green-600"
                        : parseFloat(rubricScores[c.key] ?? "0") >= 5
                          ? "text-yellow-600"
                          : "text-red-600"
                    )}>
                      {rubricScores[c.key] ?? "0"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Provide detailed feedback on the student's performance..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Improvement Areas (one per line)
                </label>
                <textarea
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Focus on paragraph structure&#10;Improve vocabulary range&#10;Work on pronunciation of 'th' sounds"
                />
              </div>
            </div>
          </Card>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">Evaluation saved successfully.</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" loading={saving} onClick={() => handleSave(false)}>
              Save as Draft
            </Button>
            <Button loading={saving} onClick={() => handleSave(true)}>
              Finalize Evaluation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
