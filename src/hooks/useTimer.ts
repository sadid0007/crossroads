"use client";
import { useEffect, useRef, useCallback } from "react";
import { useTestStore } from "@/store/test-store";

export function useTimer(onExpire?: () => void) {
  const { timerSeconds, timerRunning, decrementTimer } = useTestStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        decrementTimer();
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timerSeconds > 0, decrementTimer]);

  useEffect(() => {
    if (timerRunning && timerSeconds === 0 && onExpireRef.current) {
      onExpireRef.current();
    }
  }, [timerSeconds, timerRunning]);

  return { timerSeconds, timerRunning };
}

export function useAutosave(sectionAttemptId: string | null) {
  const { answers, setSaveStatus } = useTestStore();
  const lastSaved = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const save = useCallback(async () => {
    if (!sectionAttemptId) return;
    const serialized = JSON.stringify(answers);
    if (serialized === lastSaved.current) return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionAttemptId, answers }),
      });
      if (res.ok) {
        lastSaved.current = serialized;
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("offline");
    }
  }, [sectionAttemptId, answers, setSaveStatus]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(save, 3000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [answers, save]);

  return { save };
}
