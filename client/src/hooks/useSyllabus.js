import { useQuery } from "@tanstack/react-query";
import { fetchSubjects } from "../services/syllabusService";

export function useSubjects(params) {
  return useQuery({
    queryKey: ["subjects", params],
    queryFn: () => fetchSubjects(params),
  });
}
