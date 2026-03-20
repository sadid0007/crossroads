"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  type: string;
  timerSeconds: number;
  orderIndex: number;
}

interface TestDetail {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  difficulty: string;
  durationMinutes: number;
  sections: Section[];
}

interface ReadinessCheck {
  label: string;
  key: string;
  status: "pending" | "checking" | "pass" | "fail";
  required: boolean;
}

const sectionIcon = (type: string): string => {
  switch (type) {
    case "listening":
      return "🎧";
    case "reading":
      return "📖";
    case "writing":
      return "✍️";
    case "speaking":
      return "🎤";
    default:
      return "📝";
  }
};

export default function TestInstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"simulation" | "practice">("simulation");
  const [starting, setStarting] = useState(false);
  const [checks, setChecks] = useState<ReadinessCheck[]>([]);

  const fetchTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}`);
      if (!res.ok) throw new Error("Failed to load test");
      const data = await res.json();
      setTest(data.test);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  // Initialize readiness checks based on test sections
  useEffect(() => {
    if (!test) return;

    const sectionTypes = test.sections.map((s) => s.type);
    const initialChecks: ReadinessCheck[] = [
      { label: "Browser compatibility", key: "browser", status: "pending", required: true },
    ];

    if (sectionTypes.includes("listening") || sectionTypes.includes("speaking")) {
      initialChecks.push({
        label: "Audio playback",
        key: "audio",
        status: "pending",
        required: sectionTypes.includes("listening"),
      });
    }

    if (sectionTypes.includes("speaking")) {
      initialChecks.push({
        label: "Microphone access",
        key: "mic",
        status: "pending",
        required: true,
      });
    }

    initialChecks.push({
      label: "Stable internet connection",
      key: "network",
      status: "pending",
      required: true,
    });

    setChecks(initialChecks);
  }, [test]);

  const runReadinessChecks = async () => {
    // Browser check
    setChecks((prev) =>
      prev.map((c) => (c.key === "browser" ? { ...c, status: "checking" } : c))
    );
    await new Promise((r) => setTimeout(r, 500));
    const isBrowserOk = typeof window !== "undefined" && "fetch" in window;
    setChecks((prev) =>
      prev.map((c) =>
        c.key === "browser" ? { ...c, status: isBrowserOk ? "pass" : "fail" } : c
      )
    );

    // Audio check
    if (checks.some((c) => c.key === "audio")) {
      setChecks((prev) =>
        prev.map((c) => (c.key === "audio" ? { ...c, status: "checking" } : c))
      );
      await new Promise((r) => setTimeout(r, 500));
      const hasAudio = typeof AudioContext !== "undefined" || typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== "undefined";
      setChecks((prev) =>
        prev.map((c) =>
          c.key === "audio" ? { ...c, status: hasAudio ? "pass" : "fail" } : c
        )
      );
    }

    // Mic check
    if (checks.some((c) => c.key === "mic")) {
      setChecks((prev) =>
        prev.map((c) => (c.key === "mic" ? { ...c, status: "checking" } : c))
      );
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setChecks((prev) =>
          prev.map((c) => (c.key === "mic" ? { ...c, status: "pass" } : c))
        );
      } catch {
        setChecks((prev) =>
          prev.map((c) => (c.key === "mic" ? { ...c, status: "fail" } : c))
        );
      }
    }

    // Network check
    setChecks((prev) =>
      prev.map((c) => (c.key === "network" ? { ...c, status: "checking" } : c))
    );
    await new Promise((r) => setTimeout(r, 300));
    const isOnline = navigator.onLine;
    setChecks((prev) =>
      prev.map((c) =>
        c.key === "network" ? { ...c, status: isOnline ? "pass" : "fail" } : c
      )
    );
  };

  const allRequiredPassed = checks
    .filter((c) => c.required)
    .every((c) => c.status === "pass");

  const hasRunChecks = checks.some((c) => c.status !== "pending");

  const handleStartTest = async () => {
    if (!test) return;
    setStarting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testPackId: test.id, mode: selectedMode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start test");
      }

      const data = await res.json();
      const attempt = data.attempt;

      // Find first section attempt to redirect to
      const firstSectionAttempt = attempt.sectionAttempts?.sort(
        (a: { sectionId: string }, b: { sectionId: string }) => {
          const sectionA = test.sections.find((s) => s.id === a.sectionId);
          const sectionB = test.sections.find((s) => s.id === b.sectionId);
          return (sectionA?.orderIndex ?? 0) - (sectionB?.orderIndex ?? 0);
        }
      )[0];

      if (firstSectionAttempt) {
        router.push(`/test/${test.id}/section/${firstSectionAttempt.sectionId}?attemptId=${attempt.id}`);
      } else {
        router.push(`/test/${test.id}/section/0?attemptId=${attempt.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start test");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-96" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTest}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/tests")}
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to tests
      </button>

      {/* Test Info */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
          <Badge
            variant={
              test.difficulty === "easy"
                ? "success"
                : test.difficulty === "hard"
                ? "danger"
                : "warning"
            }
          >
            {test.difficulty}
          </Badge>
        </div>
        {test.description && (
          <p className="text-gray-500 mt-2">{test.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
          <Badge variant="info">
            {test.mode === "full_mock" ? "Full Mock" : "Section Practice"}
          </Badge>
          <span>{test.durationMinutes} minutes total</span>
        </div>
      </div>

      {/* Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Test Sections</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {test.sections
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((section, idx) => (
              <div
                key={section.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{sectionIcon(section.type)}</span>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {idx + 1}. {section.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.ceil(section.timerSeconds / 60)} minutes
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Test Mode</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedMode("simulation")}
            className={cn(
              "p-4 rounded-lg border-2 text-left transition-colors",
              selectedMode === "simulation"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <p className="font-semibold text-gray-900">Simulation Mode</p>
            <p className="text-sm text-gray-500 mt-1">
              Timed, exam-like conditions. No pausing or going back.
            </p>
          </button>
          <button
            onClick={() => setSelectedMode("practice")}
            className={cn(
              "p-4 rounded-lg border-2 text-left transition-colors",
              selectedMode === "practice"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <p className="font-semibold text-gray-900">Practice Mode</p>
            <p className="text-sm text-gray-500 mt-1">
              Relaxed pace. Pause timer, review answers, get hints.
            </p>
          </button>
        </div>
      </Card>

      {/* System Readiness */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>System Readiness</CardTitle>
            {!hasRunChecks && (
              <Button variant="outline" size="sm" onClick={runReadinessChecks}>
                Run Checks
              </Button>
            )}
            {hasRunChecks && !allRequiredPassed && (
              <Button variant="outline" size="sm" onClick={runReadinessChecks}>
                Re-run
              </Button>
            )}
          </div>
        </CardHeader>
        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.key}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {check.status === "pending" && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                {check.status === "checking" && (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                )}
                {check.status === "pass" && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {check.status === "fail" && (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <span className="text-sm text-gray-700">{check.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {check.required && (
                  <span className="text-xs text-gray-400">Required</span>
                )}
                {!check.required && (
                  <span className="text-xs text-gray-400">Optional</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {!hasRunChecks && (
          <p className="text-xs text-gray-400 mt-3">
            Run checks to verify your system is ready for the test.
          </p>
        )}
      </Card>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Start Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => router.push("/tests")}>
          Cancel
        </Button>
        <Button
          size="lg"
          loading={starting}
          disabled={hasRunChecks && !allRequiredPassed}
          onClick={handleStartTest}
        >
          {starting ? "Starting..." : "Start Test"}
        </Button>
      </div>

      {hasRunChecks && !allRequiredPassed && (
        <p className="text-sm text-red-600 text-right">
          Please resolve all required checks before starting the test.
        </p>
      )}
    </div>
  );
}
