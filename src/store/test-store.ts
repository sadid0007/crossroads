import { create } from "zustand";

interface TestState {
  attemptId: string | null;
  sectionAttemptId: string | null;
  currentSection: string | null; // listening, reading, writing, speaking
  currentPartNumber: number;
  timerSeconds: number;
  timerRunning: boolean;
  answers: Record<string, string | string[]>;
  flaggedQuestions: Set<string>;
  saveStatus: "saved" | "saving" | "offline" | "error";
  mode: "simulation" | "practice";

  setAttempt: (attemptId: string) => void;
  setSectionAttempt: (id: string) => void;
  setCurrentSection: (section: string | null) => void;
  setCurrentPart: (part: number) => void;
  setTimer: (seconds: number) => void;
  decrementTimer: () => void;
  setTimerRunning: (running: boolean) => void;
  setAnswer: (questionId: string, value: string | string[]) => void;
  toggleFlag: (questionId: string) => void;
  setSaveStatus: (status: "saved" | "saving" | "offline" | "error") => void;
  setMode: (mode: "simulation" | "practice") => void;
  reset: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  attemptId: null,
  sectionAttemptId: null,
  currentSection: null,
  currentPartNumber: 1,
  timerSeconds: 0,
  timerRunning: false,
  answers: {},
  flaggedQuestions: new Set(),
  saveStatus: "saved",
  mode: "simulation",

  setAttempt: (attemptId) => set({ attemptId }),
  setSectionAttempt: (id) => set({ sectionAttemptId: id }),
  setCurrentSection: (section) => set({ currentSection: section }),
  setCurrentPart: (part) => set({ currentPartNumber: part }),
  setTimer: (seconds) => set({ timerSeconds: seconds }),
  decrementTimer: () => {
    const current = get().timerSeconds;
    if (current > 0) set({ timerSeconds: current - 1 });
  },
  setTimerRunning: (running) => set({ timerRunning: running }),
  setAnswer: (questionId, value) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: value } })),
  toggleFlag: (questionId) =>
    set((state) => {
      const newFlags = new Set(state.flaggedQuestions);
      if (newFlags.has(questionId)) newFlags.delete(questionId);
      else newFlags.add(questionId);
      return { flaggedQuestions: newFlags };
    }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setMode: (mode) => set({ mode }),
  reset: () =>
    set({
      attemptId: null,
      sectionAttemptId: null,
      currentSection: null,
      currentPartNumber: 1,
      timerSeconds: 0,
      timerRunning: false,
      answers: {},
      flaggedQuestions: new Set(),
      saveStatus: "saved",
    }),
}));
