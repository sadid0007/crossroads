"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatBand, timeAgo } from "@/lib/utils";

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
  difficulty: string;
  durationMinutes: number;
  sections: TestSection[];
  userStatus: string | null;
}

interface TrendPoint {
  date: string;
  band: number;
  testTitle: string;
}

interface WeakArea {
  type: string;
  tag: string | null;
  accuracy: number;
  attempted: number;
}

interface Analytics {
  totalAttempts: number;
  completedAttempts: number;
  trendData: TrendPoint[];
  weakAreas: WeakArea[];
  targetBand: number | null;
}

const difficultyVariant = (d: string): "success" | "warning" | "danger" => {
  if (d === "easy") return "success";
  if (d === "hard") return "danger";
  return "warning";
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestCard[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [testsRes, analyticsRes] = await Promise.all([
        fetch("/api/tests"),
        fetch("/api/analytics?type=student"),
      ]);

      if (!testsRes.ok) throw new Error("Failed to load tests");
      if (!analyticsRes.ok) throw new Error("Failed to load analytics");

      const testsData = await testsRes.json();
      const analyticsData = await analyticsRes.json();

      setTests(testsData.tests || []);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </Card>
      </div>
    );
  }

  const targetBand = analytics?.targetBand ?? 7;
  const trend = analytics?.trendData ?? [];
  const recentScores = trend.slice(-5).reverse();
  const latestBand = trend.length > 0 ? trend[trend.length - 1].band : null;
  const maxBand = 9;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0] ?? "Student"}
          </h1>
          <p className="text-gray-500 mt-1">Track your progress and continue practicing</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tests?mode=full_mock">
            <Button>Full Mock Test</Button>
          </Link>
          <Link href="/tests?mode=section_practice">
            <Button variant="outline">Section Practice</Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Target Band</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{formatBand(targetBand)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Latest Score</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {latestBand !== null ? formatBand(latestBand) : "--"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Tests Completed</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{analytics?.completedAttempts ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Attempts</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{analytics?.totalAttempts ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          {trend.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              No completed tests yet. Take a test to see your progress.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2 h-48">
                {trend.slice(-10).map((point, idx) => {
                  const height = (point.band / maxBand) * 100;
                  const targetHeight = (targetBand / maxBand) * 100;
                  const isAboveTarget = point.band >= targetBand;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 relative h-full">
                      {/* Target line indicator */}
                      <div
                        className="absolute w-full border-t-2 border-dashed border-blue-300 pointer-events-none"
                        style={{ bottom: `${targetHeight}%` }}
                      />
                      <div className="flex-1 flex items-end w-full">
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all",
                            isAboveTarget ? "bg-green-500" : "bg-blue-500"
                          )}
                          style={{ height: `${height}%` }}
                          title={`${point.testTitle}: Band ${formatBand(point.band)}`}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {formatBand(point.band)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Oldest</span>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-blue-300" />
                  <span>Target: {formatBand(targetBand)}</span>
                </div>
                <span>Latest</span>
              </div>
            </div>
          )}
        </Card>

        {/* Weak Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Weak Areas</CardTitle>
          </CardHeader>
          {(!analytics?.weakAreas || analytics.weakAreas.length === 0) ? (
            <p className="text-gray-400 text-sm text-center py-8">
              Complete more tests to identify weak areas.
            </p>
          ) : (
            <div className="space-y-4">
              {analytics.weakAreas.map((area, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {area.tag || area.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-gray-500">{Math.round(area.accuracy)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        area.accuracy < 40 ? "bg-red-500" : area.accuracy < 65 ? "bg-yellow-500" : "bg-green-500"
                      )}
                      style={{ width: `${Math.min(area.accuracy, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{area.attempted} questions attempted</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Scores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Scores</CardTitle>
            <Link href="/history" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
        </CardHeader>
        {recentScores.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No scores yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Test</th>
                  <th className="pb-2 font-medium">Band Score</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentScores.map((score, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-3 text-gray-900">{score.testTitle}</td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold",
                          score.band >= targetBand
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        )}
                      >
                        {formatBand(score.band)}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{timeAgo(new Date(score.date))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Available Tests Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Tests</h2>
          <Link href="/tests" className="text-sm text-blue-600 hover:text-blue-700">
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.slice(0, 6).map((test) => (
            <Link key={test.id} href={`/test/${test.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{test.title}</h3>
                  <Badge variant={difficultyVariant(test.difficulty)}>
                    {test.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Badge variant="info">{test.mode === "full_mock" ? "Full Mock" : "Section"}</Badge>
                  <span>{test.durationMinutes} min</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {test.sections.map((s) => (
                    <span
                      key={s.id}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize"
                    >
                      {s.type}
                    </span>
                  ))}
                </div>
                {test.userStatus && (
                  <Badge
                    variant={
                      test.userStatus === "submitted" || test.userStatus === "evaluated"
                        ? "success"
                        : test.userStatus === "in_progress"
                        ? "warning"
                        : "default"
                    }
                  >
                    {test.userStatus === "in_progress"
                      ? "In Progress"
                      : test.userStatus === "submitted"
                      ? "Completed"
                      : test.userStatus === "evaluated"
                      ? "Evaluated"
                      : test.userStatus}
                  </Badge>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
