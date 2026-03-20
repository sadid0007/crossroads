"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [targetBand, setTargetBand] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setTargetBand(user.targetBand?.toString() ?? "");
    }
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          targetBand: targetBand ? parseFloat(targetBand) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update profile");
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 capitalize">{user.role}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
          <Input
            label="Target Band Score"
            type="number"
            min="1"
            max="9"
            step="0.5"
            value={targetBand}
            onChange={(e) => setTargetBand(e.target.value)}
            placeholder="e.g., 7.0"
          />
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">Profile updated successfully.</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
        <Button loading={saving} onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
