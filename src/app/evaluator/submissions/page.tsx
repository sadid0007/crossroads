"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Submission {
  id: string;
  type: "writing" | "speaking";
  studentName: string;
  testTitle: string;
  taskOrPart: string;
  wordCount?: number;
  evaluationStatus: string;
  submittedAt: string;
}

export default function EvaluatorSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "in_review" | "evaluated">("pending");

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const res = await fetch(`/api/evaluations?status=${filter}`);
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, [filter]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "in_review":
        return <Badge variant="info">In Review</Badge>;
      case "evaluated":
        return <Badge variant="success">Evaluated</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Submissions to Evaluate</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "in_review", "evaluated"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === f
                ? "bg-purple-100 text-purple-700"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            {f === "all" ? "All" : f === "in_review" ? "In Review" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No submissions found.</p>
            <p className="text-sm text-gray-400">
              {filter === "pending"
                ? "No pending submissions to evaluate."
                : "Try changing the filter."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card key={sub.id}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                    sub.type === "writing" ? "bg-blue-500" : "bg-green-500"
                  )}>
                    {sub.type === "writing" ? "W" : "S"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{sub.studentName}</p>
                    <p className="text-sm text-gray-500">
                      {sub.testTitle} &middot; {sub.taskOrPart}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {sub.wordCount != null && (
                    <span className="text-sm text-gray-500">{sub.wordCount} words</span>
                  )}
                  {statusBadge(sub.evaluationStatus)}
                  <span className="text-xs text-gray-400">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    variant={sub.evaluationStatus === "evaluated" ? "outline" : "primary"}
                    onClick={() => window.location.href = `/evaluator/evaluate/${sub.id}?type=${sub.type}`}
                  >
                    {sub.evaluationStatus === "evaluated" ? "View" : "Evaluate"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
