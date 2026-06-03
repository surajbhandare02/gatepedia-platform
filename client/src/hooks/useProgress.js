import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProgress,
  fetchAnalytics,
  createProgress,
  updateProgress,
  deleteProgress,
} from "../services/progressService";

export function useProgressList(params) {
  return useQuery({
    queryKey: ["progress", params],
    queryFn: () => fetchProgress(params),
  });
}

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: fetchAnalytics,
  });
}

export function useProgressMutations() {
  const queryClient = useQueryClient();

  const createMut = useMutation({
    mutationFn: createProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateProgress(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return { createMut, updateMut, deleteMut };
}
