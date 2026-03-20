"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { TestHeader } from "@/components/layout/TestHeader";
import { QuestionNav } from "@/components/layout/QuestionNav";
import { QuestionRenderer } from "@/components/test-engine/QuestionRenderer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTestStore } from "@/store/test-store";
import { useTimer, useAutosave } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";

interface QuestionData {
  id: string;
  type: string;
  text: string;
  optionsJson: string | null;
  imageUrl: string | null;
  orderIndex: number;
  groupId: string;
}

interface QuestionGroupData {
  id: string;
  orderIndex: number;
  partNumber: number;
  linkedPassageOrPromptId: string | null;
  questions: QuestionData[];
}

interface PassageOrPromptData {
  id: string;
  orderIndex: number;
  title: string | null;
  contentHtml: string;
}

interface SectionData {
  id: string;
  type: string;
  timerSeconds: number;
  passagesOrPrompts: PassageOrPromptData[];
  questionGroups: QuestionGroupData[];
}

interface TestData {
  id: string;
  title: string;
  sections: SectionData[];
}

export default function ReadingTestPage() {
  const params = useParams<{ id: string; sectionAttemptId: string }>();
  const router = useRouter();
  const testId = params.id;
  const sectionAttemptId = params.sectionAttemptId;

  const {
    answers,
    setAnswer,
    setSectionAttempt,
    setCurrentSection,
    setTimer,
    setTimerRunning,
  } = useTestStore();

  const [testData, setTestData] = useState<TestData | null>(null);
  const [readingSection, setReadingSection] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activePassageIndex, setActivePassageIndex] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | undefined>();

  const { save } = useAutosave(sectionAttemptId);

  const handleTimerExpire = useCallback(() => {
    handleSubmit();
  }, []);

  useTimer(handleTimerExpire);

  // All questions sorted
  const allQuestions = useMemo(() => {
    if (!readingSection) return [];
    return readingSection.questionGroups
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .flatMap((group) =>
        group.questions
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q) => ({
            ...q,
            partNumber: group.orderIndex + 1,
            groupId: group.id,
            linkedPassageId: group.linkedPassageOrPromptId,
          }))
      );
  }, [readingSection]);

  // Passages sorted
  const passages = useMemo(() => {
    if (!readingSection) return [];
    return readingSection.passagesOrPrompts
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [readingSection]);

  const activePassage = passages[activePassageIndex] ?? null;

  // Questions for active passage
  const questionsForPassage = useMemo(() => {
    if (!activePassage || !readingSection) return allQuestions;
    return allQuestions.filter((q) => q.linkedPassageId === activePassage.id);
  }, [allQuestions, activePassage, readingSection]);

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitting(true);
    try {
      await save();
      await fetch("/api/sections/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionAttemptId }),
      });
      setSubmitted(true);
      setTimerRunning(false);
      setShowSubmitModal(false);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [sectionAttemptId, save, setTimerRunning, submitted]);

  // Fetch test data
  useEffect(() => {
    let cancelled = false;

    async function loadTest() {
      try {
        const res = await fetch(`/api/tests/${testId}`);
        if (!res.ok) throw new Error("Failed to load test");
        const { test } = await res.json();

        if (cancelled) return;
        setTestData(test);

        const section = test.sections.find(
          (s: SectionData) => s.type === "reading"
        );
        if (!section) {
          setError("Reading section not found");
          setLoading(false);
          return;
        }
        setReadingSection(section);

        // Fetch saved answers
        const answersRes = await fetch(
          `/api/answers?sectionAttemptId=${sectionAttemptId}`
        );
        if (answersRes.ok) {
          const { answers: savedAnswers } = await answersRes.json();
          if (savedAnswers && typeof savedAnswers === "object") {
            for (const [qId, val] of Object.entries(savedAnswers)) {
              setAnswer(qId, val as string | string[]);
            }
          }
        }

        setSectionAttempt(sectionAttemptId);
        setCurrentSection("reading");

        const startRes = await fetch("/api/sections/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionAttemptId }),
        });
        if (startRes.ok) {
          const { timerSeconds: secs } = await startRes.json();
          setTimer(secs);
          setTimerRunning(true);
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }

    loadTest();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, sectionAttemptId]);

  // Set initial current question
  useEffect(() => {
    if (questionsForPassage.length > 0 && !currentQuestionId) {
      setCurrentQuestionId(questionsForPassage[0].id);
    }
  }, [questionsForPassage, currentQuestionId]);

  const handleSelectQuestion = (qId: string) => {
    setCurrentQuestionId(qId);
    const el = document.getElementById(`question-${qId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswer(questionId, value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading reading test...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Error</p>
          <p className="text-gray-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const answeredCount = allQuestions.filter((q) => !!answers[q.id]).length;
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reading Test Submitted</h2>
          <p className="text-gray-600 mb-2">
            You answered {answeredCount} of {allQuestions.length} questions.
          </p>
          <Button onClick={() => router.push(`/test/${testId}`)}>Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TestHeader
        testTitle={testData?.title ?? "IELTS Reading"}
        sectionLabel={`Reading - Passage ${activePassageIndex + 1}`}
        onSubmit={() => setShowSubmitModal(true)}
      />

      {/* Passage tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="flex -mb-px space-x-6">
            {passages.map((passage, idx) => {
              const isActive = activePassageIndex === idx;
              const passageQuestions = allQuestions.filter(
                (q) => q.linkedPassageId === passage.id
              );
              const answeredInPassage = passageQuestions.filter(
                (q) => !!answers[q.id]
              ).length;

              return (
                <button
                  key={passage.id}
                  onClick={() => {
                    setActivePassageIndex(idx);
                    setCurrentQuestionId(undefined);
                  }}
                  className={cn(
                    "py-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-2",
                    isActive
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  Passage {idx + 1}
                  <span className="text-xs text-gray-400">
                    {answeredInPassage}/{passageQuestions.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Split pane: passage + questions */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex gap-6">
          {/* Passage panel */}
          <div className="w-1/2 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-32 max-h-[calc(100vh-10rem)] overflow-y-auto">
              {activePassage && (
                <>
                  {activePassage.title && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {activePassage.title}
                    </h3>
                  )}
                  <div
                    className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: activePassage.contentHtml }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Questions panel */}
          <div className="flex-1 space-y-4">
            {questionsForPassage.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">
                  No questions for this passage.
                </p>
              </div>
            ) : (
              questionsForPassage.map((q) => (
                <QuestionRenderer
                  key={q.id}
                  question={q}
                  value={answers[q.id] ?? ""}
                  onChange={handleAnswerChange}
                  questionNumber={q.orderIndex + 1}
                />
              ))
            )}
          </div>

          {/* Question navigation sidebar */}
          <div className="hidden xl:block w-56 flex-shrink-0">
            <div className="sticky top-32">
              <QuestionNav
                questions={allQuestions.map((q) => ({
                  id: q.id,
                  orderIndex: q.orderIndex,
                  groupId: q.groupId,
                  partNumber: q.partNumber,
                }))}
                currentQuestionId={currentQuestionId}
                onSelectQuestion={handleSelectQuestion}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit modal */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Reading Test"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to submit your reading test? This action cannot be undone.
          </p>
          <div className="p-3 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Questions answered</span>
              <span className="text-sm text-gray-900 font-medium">
                {allQuestions.filter((q) => !!answers[q.id]).length} / {allQuestions.length}
              </span>
            </div>
          </div>
          {allQuestions.some((q) => !answers[q.id]) && (
            <p className="text-sm text-amber-600">
              You have unanswered questions. Are you sure you want to submit?
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              Confirm Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
