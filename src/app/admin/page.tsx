"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalStudents: number;
  totalTests: number;
  totalAttempts: number;
  pendingEvaluations: number;
  recentAttempts: {
    id: string;
    studentName: string;
    testTitle: string;
    status: string;
    createdAt: string;
  }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/analytics?type=admin_dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Students", value: stats?.totalStudents ?? 0, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Published Tests", value: stats?.totalTests ?? 0, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Attempts", value: stats?.totalAttempts ?? 0, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Pending Evaluations", value: stats?.pendingEvaluations ?? 0, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <div className={cn("p-4 rounded-xl", stat.bg)}>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className={cn("text-3xl font-bold mt-1", stat.color)}>{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attempts</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {(stats?.recentAttempts ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No recent attempts</p>
          ) : (
            stats!.recentAttempts.map((attempt) => (
              <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{attempt.studentName}</p>
                  <p className="text-xs text-gray-500">{attempt.testTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      attempt.status === "evaluated" ? "success" :
                      attempt.status === "submitted" ? "info" :
                      attempt.status === "in_progress" ? "warning" : "default"
                    }
                  >
                    {attempt.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {new Date(attempt.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
