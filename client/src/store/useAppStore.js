import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAppStore = create(
  persist(
    (set) => ({
      dailyGoal: 4,
      setDailyGoal: (hours) => set({ dailyGoal: hours }),
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "gatepedia-app-storage",
    }
  )
);
