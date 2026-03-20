"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (user) return;
    setLoading(true);
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, []);

  return { user, loading };
}
