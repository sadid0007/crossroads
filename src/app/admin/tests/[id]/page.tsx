"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

/* ---------- Types ---------- */

interface Question {
  id: string;
  type: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  variants: string[];
  explanation: string;
  subSkillTags: string[];
  marks: number;
}

interface QuestionGroup {
  id: string;
  label: string;
  questions: Question[];
}

interface Passage {
  id: string;
  title: string;
  content: string;
  questionGroups: QuestionGroup[];
}

interface Section {
  id: string;
  type: "listening" | "reading" | "writing" | "speaking";
  timer: number;
  instructions: string;
  passages: Passage[];
}

interface TestPack {
  id: string;
  title: string;
  description: string;
  status: string;
  mode: string;
  difficulty: string;
  duration: number;
  sections: Section[];
}

const STATUS_BADGE: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info"; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  review: { variant: "info", label: "In Review" },
  approved: { variant: "warning", label: "Approved" },
  published: { variant: "success", label: "Published" },
  archived: { variant: "danger", label: "Archived" },
};

const SECTION_TYPES = [
  { value: "listening", label: "Listening" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
];

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false_ng", label: "True/False/Not Given" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "matching", label: "Matching" },
  { value: "short_answer", label: "Short Answer" },
  { value: "sentence_completion", label: "Sentence Completion" },
  { value: "essay", label: "Essay" },
  { value: "speaking_prompt", label: "Speaking Prompt" },
];

/* ---------- Section Form Modal ---------- */

function SectionFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { type: string; timer: number; instructions: string }) => void;
  submitting: boolean;
}) {
  const [type, setType] = useState("listening");
  const [timer, setTimer] = useState("2400");
  const [instructions, setInstructions] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ type, timer: parseInt(timer, 10), instructions });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Section">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Section Type"
          id="section-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={SECTION_TYPES}
        />
        <Input
          label="Timer (seconds)"
          id="section-timer"
          type="number"
          min={60}
          required
          value={timer}
          onChange={(e) => setTimer(e.target.value)}
        />
        <div>
          <label htmlFor="section-instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Instructions
          </label>
          <textarea
            id="section-instructions"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Instructions shown to the student before this section"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add Section
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Passage Form Modal ---------- */

function PassageFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, content });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Passage / Prompt" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          id="passage-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Reading Passage 1"
        />
        <div>
          <label htmlFor="passage-content" className="block text-sm font-medium text-gray-700 mb-1">
            Content
          </label>
          <textarea
            id="passage-content"
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste the passage text or writing/speaking prompt here..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add Passage
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Question Builder Modal ---------- */

function QuestionBuilderModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Question, "id">) => void;
  submitting: boolean;
}) {
  const [type, setType] = useState("multiple_choice");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [variants, setVariants] = useState("");
  const [explanation, setExplanation] = useState("");
  const [subSkillTags, setSubSkillTags] = useState("");
  const [marks, setMarks] = useState("1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type,
      questionText,
      options: type === "multiple_choice" ? options.filter(Boolean) : [],
      correctAnswer,
      variants: variants ? variants.split(",").map((v) => v.trim()) : [],
      explanation,
      subSkillTags: subSkillTags ? subSkillTags.split(",").map((t) => t.trim()) : [],
      marks: parseInt(marks, 10),
    });
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const showOptions = type === "multiple_choice" || type === "true_false_ng";

  return (
    <Modal open={open} onClose={onClose} title="Add Question" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Select
          label="Question Type"
          id="q-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={QUESTION_TYPES}
        />
        <div>
          <label htmlFor="q-text" className="block text-sm font-medium text-gray-700 mb-1">
            Question Text
          </label>
          <textarea
            id="q-text"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>

        {showOptions && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Options</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 w-6">{String.fromCharCode(65 + i)}.</span>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              + Add Option
            </Button>
          </div>
        )}

        <Input
          label="Correct Answer"
          id="q-answer"
          required
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          placeholder="e.g. A, True, or the exact text"
        />
        <Input
          label="Accepted Variants (comma-separated)"
          id="q-variants"
          value={variants}
          onChange={(e) => setVariants(e.target.value)}
          placeholder="e.g. answer1, answer2"
        />
        <div>
          <label htmlFor="q-explanation" className="block text-sm font-medium text-gray-700 mb-1">
            Explanation
          </label>
          <textarea
            id="q-explanation"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Sub-Skill Tags (comma-separated)"
            id="q-tags"
            value={subSkillTags}
            onChange={(e) => setSubSkillTags(e.target.value)}
            placeholder="e.g. skimming, inference"
          />
          <Input
            label="Marks"
            id="q-marks"
            type="number"
            min={1}
            required
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add Question
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Main Page Component ---------- */

export default function TestEditorPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const [test, setTest] = useState<TestPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [passageModalOpen, setPassageModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Track which section/passage we're adding to
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activePassageId, setActivePassageId] = useState<string | null>(null);

  const fetchTest = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tests/${testId}`);
      if (res.ok) {
        const data = await res.json();
        setTest(data.test || data);
      }
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  const handleAddSection = async (data: { type: string; timer: number; instructions: string }) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testPackId: testId, ...data }),
      });
      if (res.ok) {
        setSectionModalOpen(false);
        fetchTest();
      }
    } catch {
      // network error
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPassage = async (data: { title: string; content: string }) => {
    if (!activeSectionId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/passages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: activeSectionId, ...data }),
      });
      if (res.ok) {
        setPassageModalOpen(false);
        setActiveSectionId(null);
        fetchTest();
      }
    } catch {
      // network error
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddQuestion = async (data: Omit<Question, "id">) => {
    if (!activePassageId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId: activePassageId, ...data }),
      });
      if (res.ok) {
        setQuestionModalOpen(false);
        setActivePassageId(null);
        fetchTest();
      }
    } catch {
      // network error
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/publish`, { method: "POST" });
      if (res.ok) fetchTest();
    } catch {
      // network error
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Test pack not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/tests")}>
          Back to Tests
        </Button>
      </div>
    );
  }

  const badge = STATUS_BADGE[test.status] || STATUS_BADGE.draft;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-gray-500">{test.description}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="capitalize">{test.mode}</span>
            <span className="capitalize">{test.difficulty}</span>
            <span>{test.duration} min</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(`/test/${testId}/preview`, "_blank")}
          >
            Preview
          </Button>
          {test.status !== "published" && test.status !== "archived" && (
            <Button loading={publishing} onClick={handlePublish}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Sections ({test.sections?.length || 0})
          </h2>
          <Button variant="outline" onClick={() => setSectionModalOpen(true)}>
            Add Section
          </Button>
        </div>

        {(!test.sections || test.sections.length === 0) && (
          <Card className="text-center py-8">
            <p className="text-gray-500">
              No sections yet. Add a section to start building this test pack.
            </p>
          </Card>
        )}

        {test.sections?.map((section, sIdx) => (
          <Card key={section.id} padding={false}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                    {sIdx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {section.type} Section
                    </h3>
                    <p className="text-sm text-gray-500">
                      Timer: {Math.floor(section.timer / 60)} min &middot;{" "}
                      {section.passages?.length || 0} passages
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveSectionId(section.id);
                    setPassageModalOpen(true);
                  }}
                >
                  + Add Passage
                </Button>
              </div>
              {section.instructions && (
                <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  {section.instructions}
                </p>
              )}
            </div>

            {/* Passages */}
            {section.passages?.map((passage, pIdx) => (
              <div key={passage.id} className="border-b border-gray-100 last:border-b-0">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800">
                      {pIdx + 1}. {passage.title}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActivePassageId(passage.id);
                        setQuestionModalOpen(true);
                      }}
                    >
                      + Add Question
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{passage.content}</p>

                  {/* Question Groups & Questions */}
                  {passage.questionGroups?.map((group) => (
                    <div key={group.id} className="mt-3">
                      {group.label && (
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          {group.label}
                        </p>
                      )}
                      <div className="space-y-2">
                        {group.questions?.map((q, qIdx) => (
                          <div
                            key={q.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <span className="text-xs font-semibold text-gray-400 mt-0.5 w-5 text-right">
                              {qIdx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="info">{q.type.replace(/_/g, " ")}</Badge>
                                <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                              </div>
                              <p className="text-sm text-gray-700 truncate">{q.questionText}</p>
                              {q.subSkillTags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {q.subSkillTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>

      {/* Modals */}
      <SectionFormModal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        onSubmit={handleAddSection}
        submitting={submitting}
      />
      <PassageFormModal
        open={passageModalOpen}
        onClose={() => {
          setPassageModalOpen(false);
          setActiveSectionId(null);
        }}
        onSubmit={handleAddPassage}
        submitting={submitting}
      />
      <QuestionBuilderModal
        open={questionModalOpen}
        onClose={() => {
          setQuestionModalOpen(false);
          setActivePassageId(null);
        }}
        onSubmit={handleAddQuestion}
        submitting={submitting}
      />
    </div>
  );
}
