import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

import * as api from './api';
import { useAuth } from './auth';
import type { MyTasksResponse, Profile, ProfileInput } from './types';

function useToken(): string {
  const { token } = useAuth();
  if (!token) throw new Error('This query requires a signed-in user.');
  return token;
}

export function useProfile() {
  const token = useToken();
  return useQuery<Profile | null, api.ApiError>({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(token),
    retry: (failureCount, error) =>
      error.code !== 'UNAUTHORIZED' && error.code !== 'NETWORK_ERROR' && failureCount < 2,
    staleTime: 60_000,
  });
}

export function useSaveProfile(
  options?: UseMutationOptions<Profile, api.ApiError, ProfileInput>,
) {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation<Profile, api.ApiError, ProfileInput>({
    ...options,
    mutationFn: (input) => api.saveProfile(token, input),
    onSuccess: (profile, variables, onMutateResult, context) => {
      queryClient.setQueryData(['profile'], profile);
      options?.onSuccess?.(profile, variables, onMutateResult, context);
    },
  });
}

export function useTaskCatalog() {
  const token = useToken();
  return useQuery({
    queryKey: ['tasks', 'catalog'],
    queryFn: () => api.getTaskCatalog(token),
    staleTime: 5 * 60_000,
  });
}

export function useMyTasks() {
  const token = useToken();
  return useQuery<MyTasksResponse, api.ApiError>({
    queryKey: ['tasks', 'mine'],
    queryFn: () => api.getMyTasks(token),
  });
}

export function useSaveMyTasks(
  options?: UseMutationOptions<MyTasksResponse, api.ApiError, string[]>,
) {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation<MyTasksResponse, api.ApiError, string[]>({
    ...options,
    mutationFn: (taskIds) => api.saveMyTasks(token, taskIds),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.setQueryData(['tasks', 'mine'], data);
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
