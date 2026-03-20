"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface EvaluationItem {
  id: string;
  type: "writing" | "speaking";
  studentName: string;
  evaluatorName: string | null;
  testTitle: string;
  taskOrPart: string;
  evaluationStatus: string;
  overallBand: number | null;
  submittedAt: string;
}

export default function AdminEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "in_review" | "evaluated">("all");

  useEffect(() => {
    async function fetchEvaluations() {
      try {
        const res = await fetch(`/api/evaluations?status=${filter}&admin=true`);
        if (res.ok) {
          const data = await res.json();
          setEvaluations(data.submissions ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchEvaluations();
  }, [filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Evaluations</h1>

      <div className="flex gap-2">
        {(["all", "pending", "in_review", "evaluated"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === f
                ? "bg-blue-100 text-blue-700"
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
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : evaluations.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">No evaluations found.</p>
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Evaluator</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Band</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {evaluations.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Badge variant={item.type === "writing" ? "info" : "success"}>
                      {item.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.studentName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.testTitle} &middot; {item.taskOrPart}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.evaluatorName ?? <span className="text-gray-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        item.evaluationStatus === "evaluated" ? "success" :
                        item.evaluationStatus === "in_review" ? "warning" : "default"
                      }
                    >
                      {item.evaluationStatus.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.overallBand?.toFixed(1) ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(item.submittedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
