"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

interface TestPack {
  id: string;
  title: string;
  description: string;
  status: "draft" | "review" | "approved" | "published" | "archived";
  mode: string;
  difficulty: string;
  attemptCount: number;
  updatedAt: string;
}

const STATUS_BADGE: Record<TestPack["status"], { variant: "default" | "success" | "warning" | "danger" | "info"; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  review: { variant: "info", label: "In Review" },
  approved: { variant: "warning", label: "Approved" },
  published: { variant: "success", label: "Published" },
  archived: { variant: "danger", label: "Archived" },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  mode: "academic",
  type: "full",
  difficulty: "medium",
  duration: "180",
};

export default function TestsPage() {
  const [tests, setTests] = useState<TestPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          mode: form.mode,
          type: form.type,
          difficulty: form.difficulty,
          duration: parseInt(form.duration, 10),
        }),
      });
      if (res.ok) {
        setForm(EMPTY_FORM);
        setModalOpen(false);
        fetchTests();
      }
    } catch {
      // network error
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/tests/${id}/publish`, { method: "POST" });
      if (res.ok) fetchTests();
    } catch {
      // network error
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/tests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (res.ok) fetchTests();
    } catch {
      // network error
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Packs</h1>
          <p className="text-sm text-gray-500 mt-1">Manage IELTS test packs and their content</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Create New Test</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : tests.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">No test packs found. Create your first test pack to get started.</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Mode</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Difficulty</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Attempts</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Last Updated</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tests.map((test) => {
                  const badge = STATUS_BADGE[test.status];
                  return (
                    <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <a
                          href={`/admin/tests/${test.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {test.title}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600 capitalize">{test.mode}</td>
                      <td className="px-6 py-4 text-gray-600 capitalize">{test.difficulty}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{test.attemptCount}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(test.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/admin/tests/${test.id}`}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </a>
                          {test.status !== "published" && test.status !== "archived" && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={actionLoading === test.id}
                              onClick={() => handlePublish(test.id)}
                            >
                              Publish
                            </Button>
                          )}
                          {test.status !== "archived" && (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={actionLoading === test.id}
                              onClick={() => handleArchive(test.id)}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Test Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Test Pack" className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            id="title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Academic Practice Test 1"
          />
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the test pack"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Mode"
              id="mode"
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
              options={[
                { value: "academic", label: "Academic" },
                { value: "general", label: "General Training" },
              ]}
            />
            <Select
              label="Type"
              id="type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              options={[
                { value: "full", label: "Full Test" },
                { value: "section", label: "Section Only" },
                { value: "mini", label: "Mini Test" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Difficulty"
              id="difficulty"
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
              options={[
                { value: "easy", label: "Easy" },
                { value: "medium", label: "Medium" },
                { value: "hard", label: "Hard" },
              ]}
            />
            <Input
              label="Duration (minutes)"
              id="duration"
              type="number"
              min={1}
              required
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Test Pack
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
