"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { TestHeader } from "@/components/layout/TestHeader";
import { QuestionNav } from "@/components/layout/QuestionNav";
import { QuestionRenderer } from "@/components/test-engine/QuestionRenderer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTestStore } from "@/store/test-store";
import { useTimer, useAutosave } from "@/hooks/useTimer";
import { cn, parseJson } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

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
  questions: QuestionData[];
}

interface PassageOrPromptData {
  id: string;
  orderIndex: number;
  contentJson: string;
  asset?: { url: string } | null;
}

interface SectionData {
  id: string;
  type: string;
  title: string;
  timerSeconds: number;
  passagesOrPrompts: PassageOrPromptData[];
  questionGroups: QuestionGroupData[];
}

interface TestData {
  id: string;
  title: string;
  sections: SectionData[];
}

interface AudioPartMarker {
  partNumber: number;
  startTime: number; // seconds into the audio
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const TRANSFER_TIME_SECONDS = 10 * 60; // 10 minutes transfer time after Part 4

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ListeningTestPage() {
  const params = useParams<{ id: string; sectionAttemptId: string }>();
  const router = useRouter();
  const testId = params.id;
  const sectionAttemptId = params.sectionAttemptId;

  /* ---- Store ---- */
  const {
    answers,
    setAnswer,
    setSectionAttempt,
    setCurrentSection,
    setCurrentPart,
    setTimer,
    setTimerRunning,
    currentPartNumber,
    mode,
  } = useTestStore();

  /* ---- Local state ---- */
  const [testData, setTestData] = useState<TestData | null>(null);
  const [listeningSection, setListeningSection] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioEnded, setAudioEnded] = useState(false);

  // Part markers from content JSON
  const [partMarkers, setPartMarkers] = useState<AudioPartMarker[]>([]);

  // Locked parts (simulation mode only)
  const [lockedParts, setLockedParts] = useState<number[]>([]);

  // Transfer time phase
  const [inTransferTime, setInTransferTime] = useState(false);

  // Current question focus
  const [currentQuestionId, setCurrentQuestionId] = useState<string | undefined>();

  const audioRef = useRef<HTMLAudioElement>(null);

  /* ---- Hooks ---- */
  const { save } = useAutosave(sectionAttemptId);

  const handleTimerExpire = useCallback(() => {
    if (inTransferTime) {
      // Transfer time is over, auto-submit
      handleSubmit();
    }
  }, [inTransferTime]);

  useTimer(handleTimerExpire);

  /* ---- Derived: all questions sorted ---- */
  const allQuestions = useMemo(() => {
    if (!listeningSection) return [];
    return listeningSection.questionGroups
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .flatMap((group) =>
        group.questions
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q) => ({
            ...q,
            partNumber: group.partNumber,
            groupId: group.id,
          }))
      );
  }, [listeningSection]);

  const questionsForPart = useMemo(() => {
    return allQuestions.filter((q) => q.partNumber === currentPartNumber);
  }, [allQuestions, currentPartNumber]);

  const totalParts = useMemo(() => {
    if (!listeningSection) return 4;
    const parts = new Set(listeningSection.questionGroups.map((g) => g.partNumber));
    return parts.size || 4;
  }, [listeningSection]);

  /* ---- Audio time tracking for part transitions ---- */
  useEffect(() => {
    if (mode !== "simulation" || partMarkers.length === 0) return;
    // Determine the current part from audio position
    let activePart = 1;
    for (const marker of partMarkers) {
      if (audioCurrentTime >= marker.startTime) {
        activePart = marker.partNumber;
      }
    }
    if (activePart !== currentPartNumber) {
      // Lock previous parts
      const newLocked: number[] = [];
      for (let p = 1; p < activePart; p++) {
        newLocked.push(p);
      }
      setLockedParts(newLocked);
      setCurrentPart(activePart);
    }
  }, [audioCurrentTime, partMarkers, mode, currentPartNumber, setCurrentPart]);

  /* ---- Audio ended => start transfer time ---- */
  useEffect(() => {
    if (!audioEnded || inTransferTime) return;
    setInTransferTime(true);
    // Unlock all parts for review during transfer time
    setLockedParts([]);
    setTimer(TRANSFER_TIME_SECONDS);
    setTimerRunning(true);
  }, [audioEnded, inTransferTime, setTimer, setTimerRunning]);

  /* ---- Audio event handlers ---- */
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setAudioPlaying(false);
    setAudioEnded(true);
  }, []);

  const handleAudioPlay = useCallback(() => {
    setAudioPlaying(true);
  }, []);

  const handleAudioPause = useCallback(() => {
    setAudioPlaying(false);
  }, []);

  /* ---- Submit handler ---- */
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

      // Pause audio if still playing
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [sectionAttemptId, save, setTimerRunning, submitted]);

  /* ---- Fetch test data ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadTest() {
      try {
        // Fetch test data
        const res = await fetch(`/api/tests/${testId}`);
        if (!res.ok) throw new Error("Failed to load test");
        const { test } = await res.json();

        if (cancelled) return;
        setTestData(test);

        // Find listening section
        const section = test.sections.find(
          (s: SectionData) => s.type === "listening"
        );
        if (!section) {
          setError("Listening section not found");
          setLoading(false);
          return;
        }
        setListeningSection(section);

        // Extract audio URL from the first passage/prompt asset
        const audioPassage = section.passagesOrPrompts?.find(
          (p: PassageOrPromptData) => p.asset?.url
        );
        if (audioPassage?.asset?.url) {
          setAudioUrl(audioPassage.asset.url);
        }

        // Extract part markers from contentJson
        const markers: AudioPartMarker[] = [];
        for (const p of section.passagesOrPrompts || []) {
          const content = parseJson<{
            partMarkers?: AudioPartMarker[];
          }>(p.contentJson, {});
          if (content.partMarkers) {
            markers.push(...content.partMarkers);
          }
        }
        if (markers.length > 0) {
          setPartMarkers(markers.sort((a, b) => a.startTime - b.startTime));
        }

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

        // Start section
        setSectionAttempt(sectionAttemptId);
        setCurrentSection("listening");
        setCurrentPart(1);

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

  /* ---- Set initial current question ---- */
  useEffect(() => {
    if (questionsForPart.length > 0 && !currentQuestionId) {
      setCurrentQuestionId(questionsForPart[0].id);
    }
  }, [questionsForPart, currentQuestionId]);

  /* ---- Part navigation ---- */
  const handlePartClick = (partNum: number) => {
    if (lockedParts.includes(partNum)) return;
    setCurrentPart(partNum);
    const partQuestions = allQuestions.filter((q) => q.partNumber === partNum);
    if (partQuestions.length > 0) {
      setCurrentQuestionId(partQuestions[0].id);
    }
  };

  /* ---- Question navigation ---- */
  const handleSelectQuestion = (qId: string) => {
    const q = allQuestions.find((q) => q.id === qId);
    if (q) {
      setCurrentQuestionId(qId);
      if (q.partNumber !== currentPartNumber && !lockedParts.includes(q.partNumber)) {
        setCurrentPart(q.partNumber);
      }
      // Scroll to question
      const el = document.getElementById(`question-${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  /* ---- Answer change handler ---- */
  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    const q = allQuestions.find((q) => q.id === questionId);
    if (q && lockedParts.includes(q.partNumber)) return;
    setAnswer(questionId, value);
  };

  /* ---- Audio progress percentage ---- */
  const audioProgress = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;

  /* ---- Render: Loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading listening test...</p>
        </div>
      </div>
    );
  }

  /* ---- Render: Error ---- */
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

  /* ---- Render: Submitted ---- */
  if (submitted) {
    const answeredCount = allQuestions.filter((q) => !!answers[q.id]).length;
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Listening Test Submitted
          </h2>
          <p className="text-gray-600 mb-2">
            You answered {answeredCount} of {allQuestions.length} questions.
          </p>
          <Button onClick={() => router.push(`/test/${testId}`)}>Continue</Button>
        </div>
      </div>
    );
  }

  /* ---- Render: Main ---- */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with timer and submit */}
      <TestHeader
        testTitle={testData?.title ?? "IELTS Listening"}
        sectionLabel={
          inTransferTime
            ? "Listening - Transfer Time"
            : `Listening - Part ${currentPartNumber}`
        }
        onSubmit={() => setShowSubmitModal(true)}
      />

      {/* Audio Player */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          {audioUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (!audioRef.current) return;
                    if (audioPlaying) {
                      audioRef.current.pause();
                    } else {
                      audioRef.current.play();
                    }
                  }}
                  disabled={audioEnded}
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    audioEnded
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {audioPlaying ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                {/* Progress bar */}
                <div className="flex-1 relative">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  {/* Part markers on progress bar */}
                  {partMarkers.map((marker) => (
                    <div
                      key={marker.partNumber}
                      className="absolute top-0 w-0.5 h-2 bg-gray-400"
                      style={{
                        left: `${audioDuration > 0 ? (marker.startTime / audioDuration) * 100 : 0}%`,
                      }}
                      title={`Part ${marker.partNumber}`}
                    />
                  ))}
                </div>

                <span className="text-sm text-gray-500 tabular-nums flex-shrink-0 min-w-[80px] text-right">
                  {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                </span>
              </div>

              {audioEnded && inTransferTime && (
                <p className="text-sm text-blue-700 font-medium">
                  Audio has ended. You have 10 minutes to transfer and review your answers.
                </p>
              )}

              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleAudioEnded}
                onPlay={handleAudioPlay}
                onPause={handleAudioPause}
                preload="auto"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500">No audio available for this section.</p>
          )}
        </div>
      </div>

      {/* Part indicator tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="flex -mb-px space-x-6">
            {Array.from({ length: totalParts }, (_, i) => i + 1).map((partNum) => {
              const isActive = currentPartNumber === partNum;
              const isLocked = lockedParts.includes(partNum);
              const partQs = allQuestions.filter((q) => q.partNumber === partNum);
              const answeredInPart = partQs.filter((q) => !!answers[q.id]).length;

              return (
                <button
                  key={partNum}
                  onClick={() => handlePartClick(partNum)}
                  disabled={isLocked}
                  className={cn(
                    "py-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-2",
                    isActive
                      ? "border-blue-500 text-blue-600"
                      : isLocked
                        ? "border-transparent text-gray-300 cursor-not-allowed"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  Part {partNum}
                  {isLocked && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span className="text-xs text-gray-400">
                    {answeredInPart}/{partQs.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex gap-6">
          {/* Questions panel */}
          <div className="flex-1 space-y-4">
            {questionsForPart.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">
                  No questions available for Part {currentPartNumber}.
                </p>
              </div>
            ) : (
              questionsForPart.map((q) => {
                const isLocked = lockedParts.includes(q.partNumber);
                return (
                  <QuestionRenderer
                    key={q.id}
                    question={q}
                    value={answers[q.id] ?? ""}
                    onChange={handleAnswerChange}
                    disabled={isLocked}
                    questionNumber={q.orderIndex + 1}
                  />
                );
              })
            )}
          </div>

          {/* Question navigation sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
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
                lockedParts={lockedParts}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit confirmation modal */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Listening Test"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to submit your listening test? This action cannot
            be undone.
          </p>
          <div className="p-3 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Questions answered
              </span>
              <span className="text-sm text-gray-900 font-medium">
                {allQuestions.filter((q) => !!answers[q.id]).length} /{" "}
                {allQuestions.length}
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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatAudioTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
