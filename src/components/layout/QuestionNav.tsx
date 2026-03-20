"use client";
import { cn } from "@/lib/utils";
import { useTestStore } from "@/store/test-store";

interface QuestionNavProps {
  questions: { id: string; orderIndex: number; groupId: string; partNumber?: number }[];
  currentQuestionId?: string;
  onSelectQuestion: (id: string) => void;
  lockedParts?: number[]; // Parts that are locked (Listening sim mode)
}

export function QuestionNav({ questions, currentQuestionId, onSelectQuestion, lockedParts = [] }: QuestionNavProps) {
  const { answers, flaggedQuestions } = useTestStore();

  // Group by part number if available
  const parts = new Map<number, typeof questions>();
  for (const q of questions) {
    const part = q.partNumber || 1;
    if (!parts.has(part)) parts.set(part, []);
    parts.get(part)!.push(q);
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Questions</h4>
      {Array.from(parts.entries()).map(([partNum, partQuestions]) => (
        <div key={partNum} className="mb-3">
          {parts.size > 1 && (
            <p className={cn(
              "text-xs font-medium mb-2",
              lockedParts.includes(partNum) ? "text-gray-400" : "text-gray-500"
            )}>
              Part {partNum} {lockedParts.includes(partNum) && "(locked)"}
            </p>
          )}
          <div className="grid grid-cols-5 gap-1.5">
            {partQuestions.map((q) => {
              const isAnswered = !!answers[q.id];
              const isFlagged = flaggedQuestions.has(q.id);
              const isCurrent = q.id === currentQuestionId;
              const isLocked = lockedParts.includes(q.partNumber || 1);

              return (
                <button
                  key={q.id}
                  onClick={() => !isLocked && onSelectQuestion(q.id)}
                  disabled={isLocked}
                  className={cn(
                    "w-8 h-8 rounded text-xs font-medium transition-colors relative",
                    isCurrent && "ring-2 ring-blue-500",
                    isLocked && "opacity-40 cursor-not-allowed",
                    isAnswered ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600",
                    !isLocked && !isCurrent && "hover:bg-blue-50"
                  )}
                >
                  {q.orderIndex + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-100 rounded" />
          <span>Answered</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-100 rounded" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-100 rounded relative">
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
          </div>
          <span>Flagged</span>
        </div>
      </div>
    </div>
  );
}
