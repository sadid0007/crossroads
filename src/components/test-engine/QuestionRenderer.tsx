"use client";

import { useCallback } from "react";
import { cn, parseJson } from "@/lib/utils";
import { useTestStore } from "@/store/test-store";

interface QuestionOption {
  label: string;
  value: string;
}

interface Question {
  id: string;
  type: string;
  text: string;
  optionsJson: string | null;
  imageUrl: string | null;
  orderIndex: number;
}

interface QuestionRendererProps {
  question: Question;
  value: string | string[];
  onChange: (questionId: string, value: string | string[]) => void;
  disabled?: boolean;
  questionNumber: number;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  questionNumber,
}: QuestionRendererProps) {
  const { flaggedQuestions, toggleFlag } = useTestStore();
  const isFlagged = flaggedQuestions.has(question.id);
  const options = parseJson<QuestionOption[]>(question.optionsJson, []);

  const handleSingleChange = useCallback(
    (val: string) => {
      onChange(question.id, val);
    },
    [onChange, question.id]
  );

  const handleMultipleChange = useCallback(
    (optionValue: string, checked: boolean) => {
      const current = Array.isArray(value) ? value : value ? [value] : [];
      const next = checked
        ? [...current, optionValue]
        : current.filter((v) => v !== optionValue);
      onChange(question.id, next);
    },
    [onChange, question.id, value]
  );

  const renderInput = () => {
    switch (question.type) {
      case "multiple_choice_single":
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  value === opt.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  disabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => handleSingleChange(opt.value)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-800">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case "multiple_choice_multiple":
        return (
          <div className="space-y-2">
            {options.map((opt) => {
              const currentArr = Array.isArray(value)
                ? value
                : value
                  ? [value]
                  : [];
              const isChecked = currentArr.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    isChecked
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    disabled && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={isChecked}
                    onChange={(e) =>
                      handleMultipleChange(opt.value, e.target.checked)
                    }
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800">{opt.label}</span>
                </label>
              );
            })}
          </div>
        );

      case "true_false_ng":
        return (
          <div className="space-y-2">
            {["True", "False", "Not Given"].map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  value === opt
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  disabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => handleSingleChange(opt)}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-800">{opt}</span>
              </label>
            ))}
          </div>
        );

      case "yes_no_ng":
        return (
          <div className="space-y-2">
            {["Yes", "No", "Not Given"].map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  value === opt
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  disabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => handleSingleChange(opt)}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-800">{opt}</span>
              </label>
            ))}
          </div>
        );

      case "matching_headings":
      case "matching_info":
      case "matching_features":
      case "matching_sentence_endings":
        return (
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => handleSingleChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              disabled && "opacity-60 cursor-not-allowed bg-gray-50"
            )}
          >
            <option value="">-- Select --</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "map_labeling":
        return (
          <div className="space-y-3">
            {question.imageUrl && (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={question.imageUrl}
                  alt="Map or diagram"
                  className="w-full max-h-80 object-contain bg-white"
                />
              </div>
            )}
            <input
              type="text"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => handleSingleChange(e.target.value)}
              disabled={disabled}
              placeholder="Type your answer..."
              className={cn(
                "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "placeholder:text-gray-400",
                disabled && "opacity-60 cursor-not-allowed bg-gray-50"
              )}
            />
          </div>
        );

      case "fill_blank":
      case "short_answer":
      case "sentence_completion":
      case "form_completion":
      case "note_completion":
      case "summary_completion":
      default:
        return (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => handleSingleChange(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer..."
            className={cn(
              "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "placeholder:text-gray-400",
              disabled && "opacity-60 cursor-not-allowed bg-gray-50"
            )}
          />
        );
    }
  };

  return (
    <div
      id={`question-${question.id}`}
      className={cn(
        "rounded-xl border bg-white p-5 transition-colors",
        isFlagged ? "border-yellow-300 bg-yellow-50/30" : "border-gray-200"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-semibold text-gray-700 mr-2">
            {questionNumber}
          </span>
          <span className="text-sm text-gray-800 leading-relaxed">
            {question.text}
          </span>
        </div>
        <button
          type="button"
          onClick={() => toggleFlag(question.id)}
          className={cn(
            "shrink-0 p-1.5 rounded-md transition-colors text-sm",
            isFlagged
              ? "text-yellow-600 bg-yellow-100 hover:bg-yellow-200"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          )}
          title={isFlagged ? "Unflag question" : "Flag for review"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 12.25v-8.5a.75.75 0 00-.904-.734l-2.38.501a7.25 7.25 0 01-4.186-.363l-.502-.2a8.75 8.75 0 00-5.053-.439l-1.475.31V2.75z" />
          </svg>
        </button>
      </div>

      {question.imageUrl && question.type !== "map_labeling" && (
        <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
          <img
            src={question.imageUrl}
            alt="Question illustration"
            className="w-full max-h-60 object-contain bg-white"
          />
        </div>
      )}

      <div>{renderInput()}</div>
    </div>
  );
}
