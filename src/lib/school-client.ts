import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGroup,
  getGroupReport,
  getMyProfile,
  getMyProgress,
  getPassedSlots,
  joinGroup,
  listMyGroups,
  recordSlotAttempt,
  setMyName,
  startTest,
  submitTest,
} from "@/lib/school";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authEnabled } from "@/lib/auth/client";

/**
 * True once it's safe to call the signed-in-only server functions: auth is
 * on, the session finished resolving, and someone is signed in. Every query
 * below is disabled until then, so components can call hooks unconditionally.
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

export function usePassedSlots(topic: string) {
  const ready = useSchoolReady();
  return useQuery({
    queryKey: ["school", "passed", topic],
    queryFn: () => getPassedSlots({ data: { topic } }),
    enabled: ready,
    staleTime: 5_000,
  });
}

export function useRecordSlotAttempt(topic: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { slot: number; answer: unknown }) =>
      recordSlotAttempt({ data: { topic, slot: input.slot, answer: input.answer } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["school", "progress"] });
      void qc.invalidateQueries({ queryKey: ["school", "passed", topic] });
    },
  });
}

export function useStartTest(topic: string) {
  return useMutation({ mutationFn: () => startTest({ data: { topic } }) });
}

export function useSubmitTest(topic: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { salt: string; answers: unknown[] }) =>
      submitTest({ data: { topic, salt: input.salt, answers: input.answers } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school", "progress"] }),
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
