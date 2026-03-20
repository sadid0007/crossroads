"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  averageBandScores: {
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
    overall: number | null;
  };
  completionRate: number;
  totalAttemptsThisMonth: number;
  totalAttemptsLastMonth: number;
  topTests: { title: string; attempts: number }[];
  weakestQuestionTypes: { type: string; accuracy: number }[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics?type=platform");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const sections = ["listening", "reading", "writing", "speaking"] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Average Band Scores */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Average Band Scores</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {sections.map((section) => {
            const band = data?.averageBandScores?.[section];
            return (
              <Card key={section}>
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500 capitalize mb-1">{section}</p>
                  <p className={cn("text-2xl font-bold", band && band >= 7 ? "text-green-600" : band && band >= 5.5 ? "text-yellow-600" : "text-gray-400")}>
                    {band != null ? band.toFixed(1) : "--"}
                  </p>
                </div>
              </Card>
            );
          })}
          <Card>
            <div className="text-center py-4">
              <p className="text-xs text-gray-500 mb-1">Overall</p>
              <p className="text-2xl font-bold text-blue-600">
                {data?.averageBandScores?.overall != null ? data.averageBandScores.overall.toFixed(1) : "--"}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="font-bold text-gray-900">{data?.totalAttemptsThisMonth ?? 0} attempts</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm text-gray-600">Last Month</span>
              <span className="font-bold text-gray-900">{data?.totalAttemptsLastMonth ?? 0} attempts</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="font-bold text-gray-900">{data?.completionRate ?? 0}%</span>
            </div>
          </div>
        </Card>

        {/* Top Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Tests</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {(data?.topTests ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
            ) : (
              data!.topTests.map((test, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">{idx + 1}.</span>
                    <span className="text-sm text-gray-900">{test.title}</span>
                  </div>
                  <span className="text-sm text-gray-600">{test.attempts} attempts</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Weakest Question Types */}
      <Card>
        <CardHeader>
          <CardTitle>Weakest Question Types (Platform Average)</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {(data?.weakestQuestionTypes ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
          ) : (
            data!.weakestQuestionTypes.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span className="text-sm text-gray-700 capitalize">{item.type.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={cn("h-2 rounded-full", item.accuracy >= 60 ? "bg-yellow-500" : "bg-red-500")}
                      style={{ width: `${item.accuracy}%` }}
                    />
                  </div>
                  <span className={cn("text-sm font-medium w-12 text-right", item.accuracy >= 60 ? "text-yellow-600" : "text-red-600")}>
                    {item.accuracy}%
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
