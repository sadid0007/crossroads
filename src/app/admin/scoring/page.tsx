"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface ScoringConfig {
  id: string;
  testPackId: string;
  testPackTitle: string;
  sectionType: string;
  version: number;
  isActive: boolean;
  rawToBandMap: Record<string, number>;
}

export default function AdminScoringPage() {
  const [configs, setConfigs] = useState<ScoringConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfigs() {
      try {
        const res = await fetch("/api/admin/scoring");
        if (res.ok) {
          const data = await res.json();
          setConfigs(data.configs ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchConfigs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Scoring Configuration</h1>
      </div>

      <p className="text-sm text-gray-500">
        Manage raw score to band score mappings for Listening and Reading sections.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No scoring configurations found.</p>
            <p className="text-sm text-gray-400">
              Scoring configurations are created automatically when tests are published.
              Default IELTS band mapping tables are used when no custom configuration exists.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <Card key={config.id}>
              <button
                className="w-full text-left p-4"
                onClick={() => setExpandedId(expandedId === config.id ? null : config.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{config.testPackTitle}</p>
                    <p className="text-sm text-gray-500 capitalize">{config.sectionType} &middot; Version {config.version}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={config.isActive ? "success" : "default"}>
                      {config.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <svg
                      className={cn("w-5 h-5 text-gray-400 transition-transform", expandedId === config.id && "rotate-180")}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {expandedId === config.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Raw Score to Band Mapping</h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
                    {Object.entries(config.rawToBandMap)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([raw, band]) => (
                        <div key={raw} className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Raw {raw}</p>
                          <p className="font-bold text-gray-900">{band}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
