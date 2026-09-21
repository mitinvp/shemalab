import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGroup,
  getGroupReport,
  getMyProfile,
  getMyProgress,
  joinGroup,
  listMyGroups,
  recordSlotAttempt,
  setMyName,
  submitExamResult,
} from "@/lib/school";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authEnabled } from "@/lib/auth/client";

/**
 * True once it's safe to call the signed-in-only server functions above:
 * auth is on, the session finished resolving, and someone is signed in.
 * Every hook below is a no-op query (`enabled: false`) until this is true,
 * so components can call these hooks unconditionally.
 */
export function useSchoolReady(): boolean {
  const { user, isPending } = useCurrentUserState();
  return authEnabled && !isPending && user !== null;
}

export function useMyProfile() {
  const ready = useSchoolReady();
  return useQuery({
    queryKey: ["school", "profile"],
    queryFn: () => getMyProfile(),
    enabled: ready,
    staleTime: 30_000,
  });
}

export function useSetMyName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fullName: string) => setMyName({ data: { fullName } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school", "profile"] }),
  });
}

export function useMyProgress() {
  const ready = useSchoolReady();
  return useQuery({
    queryKey: ["school", "progress"],
    queryFn: () => getMyProgress(),
    enabled: ready,
    staleTime: 5_000,
  });
}

export function useRecordSlotAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { topic: string; slot: number; answer: unknown }) =>
      recordSlotAttempt({ data: input as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school", "progress"] }),
  });
}

export function useSubmitExamResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { attemptSalt: string; answers: Record<string, unknown> }) =>
      submitExamResult({ data: input as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school", "profile"] }),
  });
}

export function useMyGroups() {
  const ready = useSchoolReady();
  return useQuery({
    queryKey: ["school", "groups"],
    queryFn: () => listMyGroups(),
    enabled: ready,
    staleTime: 5_000,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createGroup({ data: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school", "groups"] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => joinGroup({ data: { code } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school", "profile"] }),
  });
}

export function useGroupReport(groupId: string | null) {
  const ready = useSchoolReady();
  return useQuery({
    queryKey: ["school", "report", groupId],
    queryFn: () => getGroupReport({ data: { groupId: groupId as string } }),
    enabled: ready && groupId !== null,
    staleTime: 5_000,
  });
}
