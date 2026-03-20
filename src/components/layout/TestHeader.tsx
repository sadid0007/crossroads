"use client";
import { formatTime } from "@/lib/utils";
import { useTestStore } from "@/store/test-store";
import { cn } from "@/lib/utils";

interface TestHeaderProps {
  testTitle: string;
  sectionLabel: string;
  onSubmit?: () => void;
}

export function TestHeader({ testTitle, sectionLabel, onSubmit }: TestHeaderProps) {
  const { timerSeconds, saveStatus, answers, flaggedQuestions } = useTestStore();

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flaggedQuestions.size;

  const timerColor = timerSeconds < 300 ? "text-red-600" : timerSeconds < 600 ? "text-yellow-600" : "text-gray-900";

  const saveColors = {
    saved: "text-green-600",
    saving: "text-yellow-600",
    offline: "text-red-600",
    error: "text-red-600",
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-sm text-gray-500">{testTitle}</p>
            <p className="font-semibold text-gray-900">{sectionLabel}</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600">Answered: <strong>{answeredCount}</strong></span>
            {flaggedCount > 0 && (
              <span className="text-yellow-600">Flagged: <strong>{flaggedCount}</strong></span>
            )}
          </div>

          <div className={cn("text-sm font-medium", saveColors[saveStatus])}>
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "offline" && "Offline"}
            {saveStatus === "error" && "Save error"}
          </div>

          <div className={cn("text-2xl font-mono font-bold", timerColor)}>
            {formatTime(timerSeconds)}
          </div>

          {onSubmit && (
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
