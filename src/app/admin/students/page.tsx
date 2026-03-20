"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  targetBand: number | null;
  totalAttempts: number;
  createdAt: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/admin/students");
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <span className="text-sm text-gray-500">{students.length} total</span>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">No students found.</p>
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Attempts</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {student.name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={student.status === "active" ? "success" : "default"}>
                      {student.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.targetBand != null ? student.targetBand.toFixed(1) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.totalAttempts}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(student.createdAt).toLocaleDateString()}
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
