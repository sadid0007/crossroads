"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { TestHeader } from "@/components/layout/TestHeader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTestStore } from "@/store/test-store";
import { useTimer } from "@/hooks/useTimer";
import { parseJson, cn } from "@/lib/utils";

interface SpeakingPrompt {
  id: string;
  partNumber: number;
  title: string;
  instructions: string;
  questions: string[];
  prepTimeSeconds: number;
  speakTimeSeconds: number;
}

interface SectionData {
  id: string;
  type: string;
  timerSeconds: number;
  passagesOrPrompts: {
    id: string;
    orderIndex: number;
    contentHtml: string;
  }[];
}

interface TestData {
  id: string;
  title: string;
  sections: SectionData[];
}

type RecordingState = "idle" | "preparing" | "recording" | "done";

const PART_CONFIG = [
  { part: 1, label: "Introduction & Interview", prepTime: 0, speakTime: 300 },
  { part: 2, label: "Individual Long Turn", prepTime: 60, speakTime: 120 },
  { part: 3, label: "Two-way Discussion", prepTime: 0, speakTime: 300 },
];

export default function SpeakingTestPage() {
  const params = useParams<{ id: string; sectionAttemptId: string }>();
  const router = useRouter();
  const testId = params.id;
  const sectionAttemptId = params.sectionAttemptId;

  const {
    setSectionAttempt,
    setCurrentSection,
    setCurrentPart,
    setTimer,
    setTimerRunning,
    currentPartNumber,
  } = useTestStore();

  const [testData, setTestData] = useState<TestData | null>(null);
  const [prompts, setPrompts] = useState<SpeakingPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Recording state per part
  const [recordingStates, setRecordingStates] = useState<Record<number, RecordingState>>({
    1: "idle",
    2: "idle",
    3: "idle",
  });
  const [recordings, setRecordings] = useState<Record<number, Blob | null>>({});
  const [prepTimer, setPrepTimer] = useState(0);
  const [speakTimer, setSpeakTimer] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<Record<number, string>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const prepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speakIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useTimer(() => {
    handleFinalSubmit();
  });

  const currentPrompt = prompts.find((p) => p.partNumber === currentPartNumber);
  const currentRecordingState = recordingStates[currentPartNumber] ?? "idle";

  // Start preparation countdown
  const startPrep = useCallback((partNum: number) => {
    const config = PART_CONFIG.find((c) => c.part === partNum);
    if (!config || config.prepTime === 0) {
      startRecording(partNum);
      return;
    }

    setRecordingStates((prev) => ({ ...prev, [partNum]: "preparing" }));
    setPrepTimer(config.prepTime);

    prepIntervalRef.current = setInterval(() => {
      setPrepTimer((prev) => {
        if (prev <= 1) {
          if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
          startRecording(partNum);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start recording
  const startRecording = useCallback(async (partNum: number) => {
    const config = PART_CONFIG.find((c) => c.part === partNum);
    if (!config) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordings((prev) => ({ ...prev, [partNum]: blob }));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      setRecordingStates((prev) => ({ ...prev, [partNum]: "recording" }));
      setSpeakTimer(config.speakTime);

      speakIntervalRef.current = setInterval(() => {
        setSpeakTimer((prev) => {
          if (prev <= 1) {
            stopRecording(partNum);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access to continue.");
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback((partNum: number) => {
    if (speakIntervalRef.current) clearInterval(speakIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecordingStates((prev) => ({ ...prev, [partNum]: "done" }));
  }, []);

  // Upload recording
  const uploadRecording = useCallback(async (partNum: number) => {
    const blob = recordings[partNum];
    if (!blob) return;

    setUploadStatus((prev) => ({ ...prev, [partNum]: "uploading" }));
    try {
      const formData = new FormData();
      formData.append("audio", blob, `speaking-part${partNum}.webm`);
      formData.append("sectionAttemptId", sectionAttemptId);
      formData.append("partNumber", String(partNum));

      const res = await fetch("/api/speaking/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploadStatus((prev) => ({ ...prev, [partNum]: "uploaded" }));
      } else {
        setUploadStatus((prev) => ({ ...prev, [partNum]: "error" }));
      }
    } catch {
      setUploadStatus((prev) => ({ ...prev, [partNum]: "error" }));
    }
  }, [recordings, sectionAttemptId]);

  // Auto-upload when recording finishes
  useEffect(() => {
    for (const partNum of [1, 2, 3]) {
      if (recordingStates[partNum] === "done" && recordings[partNum] && !uploadStatus[partNum]) {
        uploadRecording(partNum);
      }
    }
  }, [recordingStates, recordings, uploadStatus, uploadRecording]);

  // Submit handler
  const handleFinalSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitting(true);

    try {
      // Stop any active recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

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
  }, [sectionAttemptId, setTimerRunning, submitted]);

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
          (s: SectionData) => s.type === "speaking"
        );
        if (!section) {
          setError("Speaking section not found");
          setLoading(false);
          return;
        }

        // Parse prompts
        const parsed: SpeakingPrompt[] = section.passagesOrPrompts
          .sort((a: { orderIndex: number }, b: { orderIndex: number }) => a.orderIndex - b.orderIndex)
          .map((p: SectionData["passagesOrPrompts"][number], idx: number) => {
            const content = parseJson<{
              title?: string;
              instructions?: string;
              questions?: string[];
              prepTimeSeconds?: number;
              speakTimeSeconds?: number;
            }>(p.contentHtml, {});
            const config = PART_CONFIG[idx] ?? PART_CONFIG[0];
            return {
              id: p.id,
              partNumber: idx + 1,
              title: content.title ?? config.label,
              instructions: content.instructions ?? "",
              questions: content.questions ?? [],
              prepTimeSeconds: content.prepTimeSeconds ?? config.prepTime,
              speakTimeSeconds: content.speakTimeSeconds ?? config.speakTime,
            };
          });
        setPrompts(parsed);

        setSectionAttempt(sectionAttemptId);
        setCurrentSection("speaking");
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
      if (speakIntervalRef.current) clearInterval(speakIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading speaking test...</p>
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
    const completedParts = Object.values(recordingStates).filter((s) => s === "done").length;
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Speaking Test Submitted</h2>
          <p className="text-gray-600 mb-2">
            You completed {completedParts} of 3 parts.
          </p>
          <Button onClick={() => router.push(`/test/${testId}`)}>Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TestHeader
        testTitle={testData?.title ?? "IELTS Speaking"}
        sectionLabel={`Speaking - Part ${currentPartNumber}`}
        onSubmit={() => setShowSubmitModal(true)}
      />

      {/* Part tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-3xl mx-auto">
          <nav className="flex -mb-px space-x-6">
            {PART_CONFIG.map((config) => {
              const isActive = currentPartNumber === config.part;
              const state = recordingStates[config.part] ?? "idle";
              return (
                <button
                  key={config.part}
                  onClick={() => setCurrentPart(config.part)}
                  className={cn(
                    "py-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-2",
                    isActive
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  Part {config.part}
                  {state === "done" && (
                    <Badge variant="success">Done</Badge>
                  )}
                  {state === "recording" && (
                    <Badge variant="danger">Recording</Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="space-y-6">
          {/* Prompt card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Part {currentPartNumber}: {currentPrompt?.title ?? PART_CONFIG[currentPartNumber - 1]?.label}
            </h3>
            {currentPrompt?.instructions && (
              <p className="text-gray-600 mb-4">{currentPrompt.instructions}</p>
            )}
            {currentPrompt?.questions && currentPrompt.questions.length > 0 && (
              <div className="space-y-2">
                {currentPrompt.questions.map((q, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-gray-800">{q}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recording controls */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            {currentRecordingState === "idle" && (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </div>
                <p className="text-gray-600">Click the button below to start recording</p>
                <Button
                  size="lg"
                  onClick={() => startPrep(currentPartNumber)}
                >
                  {PART_CONFIG[currentPartNumber - 1]?.prepTime > 0
                    ? "Start Preparation"
                    : "Start Recording"}
                </Button>
              </div>
            )}

            {currentRecordingState === "preparing" && (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
                  <span className="text-3xl font-bold text-yellow-600">{formatTimer(prepTimer)}</span>
                </div>
                <p className="text-yellow-700 font-medium">Preparation Time</p>
                <p className="text-gray-500 text-sm">Read the prompt and prepare your response. Recording will begin automatically.</p>
              </div>
            )}

            {currentRecordingState === "recording" && (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto animate-pulse">
                  <span className="text-2xl font-bold text-white">{formatTimer(speakTimer)}</span>
                </div>
                <p className="text-red-600 font-medium flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  Recording in progress
                </p>
                <Button
                  variant="outline"
                  onClick={() => stopRecording(currentPartNumber)}
                >
                  Stop Recording
                </Button>
              </div>
            )}

            {currentRecordingState === "done" && (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-700 font-medium">Recording Complete</p>
                {uploadStatus[currentPartNumber] === "uploading" && (
                  <p className="text-sm text-gray-500">Uploading...</p>
                )}
                {uploadStatus[currentPartNumber] === "uploaded" && (
                  <p className="text-sm text-green-600">Uploaded successfully</p>
                )}
                {uploadStatus[currentPartNumber] === "error" && (
                  <div>
                    <p className="text-sm text-red-600">Upload failed</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => uploadRecording(currentPartNumber)}>
                      Retry Upload
                    </Button>
                  </div>
                )}
                {recordings[currentPartNumber] && (
                  <audio
                    controls
                    src={URL.createObjectURL(recordings[currentPartNumber]!)}
                    className="mx-auto mt-2"
                  />
                )}
                {currentPartNumber < 3 && (
                  <Button onClick={() => setCurrentPart(currentPartNumber + 1)} className="mt-4">
                    Next Part
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit modal */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Speaking Test"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to submit your speaking test?
          </p>
          <div className="space-y-2">
            {PART_CONFIG.map((config) => {
              const state = recordingStates[config.part] ?? "idle";
              return (
                <div key={config.part} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">Part {config.part}</span>
                  <Badge variant={state === "done" ? "success" : state === "recording" ? "warning" : "default"}>
                    {state === "done" ? "Completed" : state === "recording" ? "In Progress" : "Not Started"}
                  </Badge>
                </div>
              );
            })}
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
