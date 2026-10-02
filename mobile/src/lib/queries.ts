import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

import * as api from './api';
import { useAuth } from './auth';
import type { MyTasksResponse, Profile, ProfileInput } from './types';

function useSession(): { token: string; userId: string } {
  const { token, user } = useAuth();
  if (!token || !user) throw new Error('This query requires a signed-in user.');
  return { token, userId: user.id };
}

export function useProfile() {
  const { token, userId } = useSession();
  return useQuery<Profile | null, api.ApiError>({
    queryKey: ['profile', userId],
    queryFn: () => api.getProfile(token),
    retry: (failureCount, error) =>
      error.code !== 'UNAUTHORIZED' && error.code !== 'NETWORK_ERROR' && failureCount < 2,
    staleTime: 60_000,
  });
}

export function useSaveProfile(
  options?: UseMutationOptions<Profile, api.ApiError, ProfileInput>,
) {
  const { token, userId } = useSession();
  const queryClient = useQueryClient();
  return useMutation<Profile, api.ApiError, ProfileInput>({
    ...options,
    mutationFn: (input) => api.saveProfile(token, input),
    onSuccess: (profile, variables, onMutateResult, context) => {
      queryClient.setQueryData(['profile', userId], profile);
      options?.onSuccess?.(profile, variables, onMutateResult, context);
    },
  });
}

export function useTaskCatalog() {
  const { token } = useSession();
  return useQuery({
    queryKey: ['tasks', 'catalog'],
    queryFn: () => api.getTaskCatalog(token),
    staleTime: 5 * 60_000,
  });
}

export function useMyTasks() {
  const { token, userId } = useSession();
  return useQuery<MyTasksResponse, api.ApiError>({
    queryKey: ['tasks', 'mine', userId],
    queryFn: () => api.getMyTasks(token),
  });
}

export function useSaveMyTasks(
  options?: UseMutationOptions<MyTasksResponse, api.ApiError, string[]>,
) {
  const { token, userId } = useSession();
  const queryClient = useQueryClient();
  return useMutation<MyTasksResponse, api.ApiError, string[]>({
    ...options,
    mutationFn: (taskIds) => api.saveMyTasks(token, taskIds),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.setQueryData(['tasks', 'mine', userId], data);
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
