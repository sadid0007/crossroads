"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
// utilities

interface TestSection {
  id: string;
  type: string;
  timerSeconds: number;
  orderIndex: number;
}

interface TestCard {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  academicOrGeneral: string | null;
  difficulty: string;
  durationMinutes: number;
  imageUrl: string | null;
  sections: TestSection[];
  attemptCount: number;
  userStatus: string | null;
}

const difficultyVariant = (d: string): "success" | "warning" | "danger" => {
  if (d === "easy") return "success";
  if (d === "hard") return "danger";
  return "warning";
};

const statusLabel = (status: string | null): { text: string; variant: "success" | "warning" | "default" | "info" } => {
  switch (status) {
    case "in_progress":
      return { text: "In Progress", variant: "warning" };
    case "submitted":
      return { text: "Completed", variant: "success" };
    case "evaluated":
      return { text: "Evaluated", variant: "info" };
    default:
      return { text: "Not Started", variant: "default" };
  }
};

export default function TestsPage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") || "";
  const initialDifficulty = searchParams.get("difficulty") || "";

  const [tests, setTests] = useState<TestCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState(initialMode);
  const [difficultyFilter, setDifficultyFilter] = useState(initialDifficulty);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (modeFilter) params.set("mode", modeFilter);
      const url = `/api/tests${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load tests");
      const data = await res.json();
      setTests(data.tests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [modeFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const filteredTests = difficultyFilter
    ? tests.filter((t) => t.difficulty === difficultyFilter)
    : tests;

  const modeOptions = [
    { value: "", label: "All Modes" },
    { value: "full_mock", label: "Full Mock" },
    { value: "section_practice", label: "Section Practice" },
  ];

  const difficultyOptions = [
    { value: "", label: "All Difficulties" },
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Test Catalog</h1>
        <p className="text-gray-500 mt-1">Browse available IELTS tests and practice sections</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48">
          <Select
            options={modeOptions}
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            aria-label="Filter by mode"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={difficultyOptions}
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            aria-label="Filter by difficulty"
          />
        </div>
        {(modeFilter || difficultyFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setModeFilter("");
              setDifficultyFilter("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTests}>Retry</Button>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTests.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-2">No tests found matching your filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModeFilter("");
              setDifficultyFilter("");
            }}
          >
            Clear filters
          </Button>
        </Card>
      )}

      {/* Test Grid */}
      {!loading && !error && filteredTests.length > 0 && (
        <>
          <p className="text-sm text-gray-500">
            Showing {filteredTests.length} test{filteredTests.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTests.map((test) => {
              const status = statusLabel(test.userStatus);
              return (
                <Link key={test.id} href={`/test/${test.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                    {/* Title & Difficulty */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">
                        {test.title}
                      </h3>
                      <Badge variant={difficultyVariant(test.difficulty)}>
                        {test.difficulty}
                      </Badge>
                    </div>

                    {/* Description */}
                    {test.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {test.description}
                      </p>
                    )}

                    {/* Mode & Duration */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Badge variant="info">
                        {test.mode === "full_mock" ? "Full Mock" : "Section Practice"}
                      </Badge>
                      <span>{test.durationMinutes} min</span>
                      {test.attemptCount > 0 && (
                        <span className="text-gray-400">
                          {test.attemptCount} attempt{test.attemptCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Sections */}
                    <div className="flex flex-wrap gap-1.5 mb-3 mt-auto">
                      {test.sections.map((s) => (
                        <span
                          key={s.id}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize"
                        >
                          {s.type}
                        </span>
                      ))}
                    </div>

                    {/* Attempt Status */}
                    <div className="pt-3 border-t border-gray-100">
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
