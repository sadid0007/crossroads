"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { TestHeader } from "@/components/layout/TestHeader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTestStore } from "@/store/test-store";
import { useTimer } from "@/hooks/useTimer";
import { parseJson, wordCount, cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TaskPrompt {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  minWords: number;
}

interface SectionData {
  id: string;
  type: string;
  title: string;
  timerSeconds: number;
  passagesOrPrompts: {
    id: string;
    orderIndex: number;
    contentJson: string;
    asset?: { url: string } | null;
  }[];
}

interface TestData {
  id: string;
  title: string;
  sections: SectionData[];
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const AUTOSAVE_INTERVAL_MS = 5_000;
const TWENTY_MINUTES = 20 * 60;
const FIVE_MINUTES = 5 * 60;
const TASK1_MIN_WORDS = 150;
const TASK2_MIN_WORDS = 250;

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function WritingTestPage() {
  const params = useParams<{ id: string; sectionAttemptId: string }>();
  const router = useRouter();
  const testId = params.id;
  const sectionAttemptId = params.sectionAttemptId;

  /* ---- Store ---- */
  const {
    setSectionAttempt,
    setCurrentSection,
    setTimer,
    setTimerRunning,
    setSaveStatus,
    saveStatus,
    timerSeconds,
    mode,
  } = useTestStore();

  /* ---- Local state ---- */
  const [testData, setTestData] = useState<TestData | null>(null);
  const [tasks, setTasks] = useState<TaskPrompt[]>([]);
  const [activeTask, setActiveTask] = useState<number>(1);
  const [texts, setTexts] = useState<Record<number, string>>({ 1: "", 2: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showTimeSplitNudge, setShowTimeSplitNudge] = useState(false);
  const [showWordCountWarning, setShowWordCountWarning] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [wordWarningDismissed, setWordWarningDismissed] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const initialTimerRef = useRef<number>(0);

  /* ---- Derived values ---- */
  const task1Words = wordCount(texts[1] ?? "");
  const task2Words = wordCount(texts[2] ?? "");
  const currentText = texts[activeTask] ?? "";
  const currentWords = wordCount(currentText);
  const currentMinWords = activeTask === 1 ? TASK1_MIN_WORDS : TASK2_MIN_WORDS;

  /* ---- Autosave ---- */
  const saveTask = useCallback(
    async (taskNumber: number, content: string) => {
      if (!sectionAttemptId) return;
      const wc = wordCount(content);
      const key = `${taskNumber}:${content}`;
      if (key === lastSavedRef.current) return;

      setSaveStatus("saving");
      try {
        const res = await fetch("/api/writing/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionAttemptId,
            taskNumber,
            contentText: content,
            wordCount: wc,
          }),
        });
        if (res.ok) {
          lastSavedRef.current = key;
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("offline");
      }
    },
    [sectionAttemptId, setSaveStatus]
  );

  const saveBothTasks = useCallback(async () => {
    await Promise.all([saveTask(1, texts[1] ?? ""), saveTask(2, texts[2] ?? "")]);
  }, [saveTask, texts]);

  /* ---- Autosave interval ---- */
  useEffect(() => {
    autosaveTimerRef.current = setInterval(() => {
      saveTask(activeTask, texts[activeTask] ?? "");
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [activeTask, texts, saveTask]);

  /* ---- Submit handler ---- */
  const handleFinalSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitting(true);

    try {
      // Save both tasks one last time
      await saveBothTasks();

      // Mark section as submitted
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
  }, [sectionAttemptId, saveBothTasks, setTimerRunning, submitted]);

  /* ---- Timer ---- */
  useTimer(() => {
    // Auto-submit on timer expiry
    handleFinalSubmit();
  });

  /* ---- Time-split nudge at 20-minute mark ---- */
  useEffect(() => {
    if (initialTimerRef.current === 0) return;
    const elapsed = initialTimerRef.current - timerSeconds;

    if (elapsed >= TWENTY_MINUTES && activeTask === 1 && !nudgeDismissed) {
      setShowTimeSplitNudge(true);
    }
  }, [timerSeconds, activeTask, nudgeDismissed]);

  /* ---- Word count warning with 5 min remaining ---- */
  useEffect(() => {
    if (timerSeconds <= FIVE_MINUTES && timerSeconds > 0 && !wordWarningDismissed) {
      const task1Below = task1Words < TASK1_MIN_WORDS;
      const task2Below = task2Words < TASK2_MIN_WORDS;
      if (task1Below || task2Below) {
        setShowWordCountWarning(true);
      }
    }
  }, [timerSeconds, task1Words, task2Words, wordWarningDismissed]);

  /* ---- Fetch test data and restore drafts ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadTest() {
      try {
        const res = await fetch(`/api/tests/${testId}`);
        if (!res.ok) throw new Error("Failed to load test");
        const { test } = await res.json();

        if (cancelled) return;
        setTestData(test);

        // Find writing section
        const writingSection = test.sections.find(
          (s: SectionData) => s.type === "writing"
        );
        if (!writingSection) {
          setError("Writing section not found");
          setLoading(false);
          return;
        }

        // Parse prompts into tasks
        const parsedTasks: TaskPrompt[] = writingSection.passagesOrPrompts
          .sort(
            (a: { orderIndex: number }, b: { orderIndex: number }) =>
              a.orderIndex - b.orderIndex
          )
          .map((p: SectionData["passagesOrPrompts"][number], idx: number) => {
            const content = parseJson<{
              title?: string;
              description?: string;
              minWords?: number;
            }>(p.contentJson, {});
            return {
              id: p.id,
              taskNumber: idx + 1,
              title: content.title ?? `Task ${idx + 1}`,
              description: content.description ?? "",
              imageUrl: p.asset?.url ?? null,
              minWords: content.minWords ?? (idx === 0 ? TASK1_MIN_WORDS : TASK2_MIN_WORDS),
            };
          });
        setTasks(parsedTasks);

        // Start section timer
        setSectionAttempt(sectionAttemptId);
        setCurrentSection("writing");

        const startRes = await fetch("/api/sections/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionAttemptId }),
        });
        if (startRes.ok) {
          const { timerSeconds: secs } = await startRes.json();
          setTimer(secs);
          initialTimerRef.current = secs;
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

  /* ---- Copy-paste prevention in simulation mode ---- */
  useEffect(() => {
    if (mode !== "simulation") return;

    const handler = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    const ta = textareaRef.current;
    if (ta) {
      ta.addEventListener("paste", handler);
      ta.addEventListener("copy", handler);
    }
    return () => {
      if (ta) {
        ta.removeEventListener("paste", handler);
        ta.removeEventListener("copy", handler);
      }
    };
  }, [mode, activeTask]);

  /* ---- Tab switch saves current task ---- */
  const handleTabSwitch = (taskNumber: number) => {
    saveTask(activeTask, texts[activeTask] ?? "");
    setActiveTask(taskNumber);
  };

  /* ---- Text change handler ---- */
  const handleTextChange = (value: string) => {
    setTexts((prev) => ({ ...prev, [activeTask]: value }));
  };

  /* ---- Fullscreen toggle ---- */
  const toggleFullscreen = () => setIsFullscreen((p) => !p);

  /* ---- Render: Loading / Error / Submitted ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading writing test...</p>
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Writing Test Submitted</h2>
          <p className="text-gray-600 mb-2">Your responses have been saved successfully.</p>
          <div className="flex justify-center gap-4 text-sm text-gray-500 mb-6">
            <span>Task 1: {task1Words} words</span>
            <span>Task 2: {task2Words} words</span>
          </div>
          <Button onClick={() => router.push(`/test/${testId}`)}>Continue</Button>
        </div>
      </div>
    );
  }

  const activeTaskData = tasks.find((t) => t.taskNumber === activeTask);

  /* ---- Render: Main ---- */
  return (
    <div className={cn("min-h-screen bg-gray-50 flex flex-col", isFullscreen && "fixed inset-0 z-40 bg-white")}>
      {/* Header */}
      {!isFullscreen && (
        <TestHeader
          testTitle={testData?.title ?? "IELTS Writing"}
          sectionLabel="Writing"
          onSubmit={() => setShowSubmitModal(true)}
        />
      )}

      {/* Fullscreen mini-header */}
      {isFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <span className="text-sm font-medium text-gray-700">
            Task {activeTask} &mdash; {currentWords} words
          </span>
          <div className="flex items-center gap-3">
            <span className={cn("text-xs", saveStatus === "saved" ? "text-green-600" : "text-yellow-600")}>
              {saveStatus === "saved" ? "Saved" : "Saving..."}
            </span>
            <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
              Exit Fullscreen
            </Button>
          </div>
        </div>
      )}

      <div className={cn("flex-1 flex flex-col", !isFullscreen && "max-w-7xl mx-auto w-full px-4 py-6")}>
        {/* Task Tabs */}
        {!isFullscreen && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px space-x-8">
              {tasks.map((task) => {
                const wc = wordCount(texts[task.taskNumber] ?? "");
                const isActive = activeTask === task.taskNumber;
                return (
                  <button
                    key={task.taskNumber}
                    onClick={() => handleTabSwitch(task.taskNumber)}
                    className={cn(
                      "py-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-2",
                      isActive
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    {task.title}
                    <Badge variant={wc >= task.minWords ? "success" : "default"}>
                      {wc} words
                    </Badge>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        <div className={cn("flex-1 flex", isFullscreen ? "flex-col p-4" : "gap-6")}>
          {/* Prompt Panel */}
          {!isFullscreen && activeTaskData && (
            <div className="w-2/5 flex-shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-3">{activeTaskData.title}</h3>
                <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
                  {activeTaskData.description}
                </div>
                {activeTaskData.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={activeTaskData.imageUrl}
                      alt={`${activeTaskData.title} visual`}
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  Minimum word count: <strong>{activeTaskData.minWords}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Editor Panel */}
          <div className="flex-1 flex flex-col">
            <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col">
              {/* Editor toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <span className="text-sm text-gray-600">
                  Task {activeTask} &mdash; Plain text editor
                </span>
                <div className="flex items-center gap-3">
                  {!isFullscreen && (
                    <span className={cn("text-xs", saveStatus === "saved" ? "text-green-600" : "text-yellow-600")}>
                      {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Save error" : "Offline"}
                    </span>
                  )}
                  <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  </Button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`Start writing your response for Task ${activeTask}...`}
                className={cn(
                  "flex-1 w-full resize-none p-4 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none",
                  isFullscreen ? "min-h-[calc(100vh-120px)]" : "min-h-[400px]"
                )}
                spellCheck
                autoFocus
              />

              {/* Word count bar */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      currentWords >= currentMinWords ? "text-green-600" : "text-gray-600"
                    )}
                  >
                    {currentWords} words
                  </span>
                  {currentWords < currentMinWords && (
                    <span className="text-xs text-amber-600">
                      ({currentMinWords - currentWords} more needed)
                    </span>
                  )}
                  {currentWords >= currentMinWords && (
                    <span className="text-xs text-green-600">Minimum reached</span>
                  )}
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      currentWords >= currentMinWords ? "bg-green-500" : "bg-blue-500"
                    )}
                    style={{ width: `${Math.min(100, (currentWords / currentMinWords) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Time-split nudge modal ---- */}
      <Modal
        open={showTimeSplitNudge}
        onClose={() => {
          setShowTimeSplitNudge(false);
          setNudgeDismissed(true);
        }}
        title="Time Check"
      >
        <div className="space-y-3">
          <p className="text-gray-700">
            You have been working on Task 1 for 20 minutes. Remember that
            <strong> Task 2 carries twice the weight</strong> of Task 1 in your
            overall writing band score.
          </p>
          <p className="text-gray-600 text-sm">
            It is recommended to spend about 20 minutes on Task 1 and 40 minutes
            on Task 2.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTimeSplitNudge(false);
                setNudgeDismissed(true);
              }}
            >
              Stay on Task 1
            </Button>
            <Button
              onClick={() => {
                setShowTimeSplitNudge(false);
                setNudgeDismissed(true);
                handleTabSwitch(2);
              }}
            >
              Switch to Task 2
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- Word count warning modal ---- */}
      <Modal
        open={showWordCountWarning}
        onClose={() => {
          setShowWordCountWarning(false);
          setWordWarningDismissed(true);
        }}
        title="Word Count Warning"
      >
        <div className="space-y-3">
          <p className="text-gray-700">
            Less than 5 minutes remaining. Please check your word counts:
          </p>
          <div className="space-y-2">
            <div className={cn("flex items-center justify-between p-3 rounded-lg", task1Words < TASK1_MIN_WORDS ? "bg-red-50" : "bg-green-50")}>
              <span className="text-sm font-medium">Task 1</span>
              <span className={cn("text-sm", task1Words < TASK1_MIN_WORDS ? "text-red-600" : "text-green-600")}>
                {task1Words} / {TASK1_MIN_WORDS} words
              </span>
            </div>
            <div className={cn("flex items-center justify-between p-3 rounded-lg", task2Words < TASK2_MIN_WORDS ? "bg-red-50" : "bg-green-50")}>
              <span className="text-sm font-medium">Task 2</span>
              <span className={cn("text-sm", task2Words < TASK2_MIN_WORDS ? "text-red-600" : "text-green-600")}>
                {task2Words} / {TASK2_MIN_WORDS} words
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Responses below the minimum word count may receive a lower band score.
          </p>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                setShowWordCountWarning(false);
                setWordWarningDismissed(true);
              }}
            >
              Got it
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- Submit confirmation modal ---- */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Writing Test"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to submit your writing test? This action cannot
            be undone.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Task 1</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 font-medium">{task1Words} words</span>
                {task1Words < TASK1_MIN_WORDS && (
                  <Badge variant="warning">Below minimum</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Task 2</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 font-medium">{task2Words} words</span>
                {task2Words < TASK2_MIN_WORDS && (
                  <Badge variant="warning">Below minimum</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleFinalSubmit}>
              Confirm Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
