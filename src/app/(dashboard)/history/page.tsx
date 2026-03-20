"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBand, timeAgo } from "@/lib/utils";

interface SectionAttempt {
  id: string;
  sectionId: string;
  status: string;
  bandScore: number | null;
  section: {
    type: string;
  };
}

interface Attempt {
  id: string;
  testPackId: string;
  status: string;
  mode: string;
  overallBandEstimate: number | null;
  startedAt: string;
  submittedAt: string | null;
  createdAt: string;
  testPack: {
    title: string;
    mode: string;
  };
  sectionAttempts: SectionAttempt[];
}

const statusConfig = (
  status: string
): { text: string; variant: "success" | "warning" | "default" | "info" | "danger" } => {
  switch (status) {
    case "in_progress":
      return { text: "In Progress", variant: "warning" };
    case "submitted":
      return { text: "Submitted", variant: "success" };
    case "evaluated":
      return { text: "Evaluated", variant: "info" };
    case "abandoned":
      return { text: "Abandoned", variant: "danger" };
    default:
      return { text: status, variant: "default" };
  }
};

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttempts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attempts");
      if (!res.ok) throw new Error("Failed to load test history");
      const data = await res.json();
      setAttempts(data.attempts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-12 bg-gray-200 rounded" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchAttempts}>Retry</Button>
        </Card>
      </div>
    );
  }

  const sectionTypes = ["listening", "reading", "writing", "speaking"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Test History</h1>
        <p className="text-gray-500 mt-1">
          Review your past attempts and scores
        </p>
      </div>

      {attempts.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">You haven&apos;t taken any tests yet.</p>
          <Link href="/tests">
            <Button>Browse Tests</Button>
          </Link>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Test</th>
                  <th className="px-6 py-3 font-medium">Mode</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  {sectionTypes.map((type) => (
                    <th key={type} className="px-4 py-3 font-medium capitalize text-center">
                      {type.slice(0, 1).toUpperCase()}
                    </th>
                  ))}
                  <th className="px-6 py-3 font-medium text-center">Overall</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => {
                  const status = statusConfig(attempt.status);
                  const isViewable =
                    attempt.status === "submitted" || attempt.status === "evaluated";

                  // Build section score map
                  const sectionScores: Record<string, number | null> = {};
                  for (const sa of attempt.sectionAttempts) {
                    sectionScores[sa.section.type] = sa.bandScore;
                  }

                  return (
                    <tr
                      key={attempt.id}
                      className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {timeAgo(new Date(attempt.createdAt))}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 max-w-[200px] truncate">
                        {attempt.testPack.title}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">
                          {attempt.mode === "simulation" ? "Simulation" : "Practice"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </td>
                      {sectionTypes.map((type) => (
                        <td key={type} className="px-4 py-4 text-center">
                          {sectionScores[type] !== undefined && sectionScores[type] !== null ? (
                            <span className="text-sm font-medium text-gray-700">
                              {formatBand(sectionScores[type]!)}
                            </span>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-center">
                        {attempt.overallBandEstimate !== null ? (
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                            {formatBand(attempt.overallBandEstimate)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isViewable ? (
                          <Link href={`/results/${attempt.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        ) : attempt.status === "in_progress" ? (
                          <Link href={`/test/${attempt.testPackId}`}>
                            <Button variant="outline" size="sm">
                              Resume
                            </Button>
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Mobile card view */}
      {attempts.length > 0 && (
        <div className="sm:hidden space-y-3">
          <p className="text-xs text-gray-400 text-center">
            Scroll the table horizontally to see all columns, or view on a larger screen.
          </p>
        </div>
      )}
    </div>
  );
}
