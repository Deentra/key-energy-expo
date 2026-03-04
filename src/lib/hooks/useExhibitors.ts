import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export interface Exhibitor {
  id: string;
  name: string;
  stand: string;
  logo: string;
  favAdd: string;
  favRemove: string;
  website: string;
  description?: string;
  isPVInstaller: number;
  status: 'New' | 'Contacted' | 'Successful Lead' | 'Rejected';
  notes: string;
}

export interface ExhibitorStats {
  total: number;
  new: number;
  contacted: number;
  successfulLeads: number;
  rejected: number;
  pvInstallers: number;
}

export interface RecognizePVJobStatus {
  state: 'idle' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  endedAt: string | null;
  totalCandidates: number;
  processed: number;
  recognized: number;
  recognizedIds: string[];
  crawledProfiles: number;
  metadataMatches: number;
  profileMatches: number;
  error: string | null;
  progress: number;
}

// Fetch exhibitors
export const useFetchExhibitors = (
  searchQuery?: string,
  filterStatus?: string,
  filterStand?: string,
  filterPVOnly?: boolean
) => {
  return useQuery({
    queryKey: ['exhibitors', searchQuery, filterStatus, filterStand, filterPVOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filterStatus && filterStatus !== 'All') params.append('status', filterStatus);
      if (filterPVOnly) params.append('isPVInstaller', 'true');
      if (filterStand) params.append('stand', filterStand);

      const response = await axios.get<Exhibitor[]>(`/api/exhibitors?${params}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Fetch stats
export const useFetchStats = () => {
  return useQuery({
    queryKey: ['exhibitor-stats'],
    queryFn: async () => {
      const response = await axios.get<ExhibitorStats>('/api/sync-exhibitors?action=status');
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

// Sync exhibitors mutation
export const useSyncExhibitors = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.get('/api/sync-exhibitors');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['exhibitors'] });
      queryClient.invalidateQueries({ queryKey: ['exhibitor-stats'] });
    },
  });
};

// Update exhibitor status mutation
export const useUpdateExhibitorStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: string;
      notes: string;
    }) => {
      // Update locally first for optimistic update
      const response = await axios.post('/api/exhibitors/update-status', {
        id,
        status,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exhibitors'] });
      queryClient.invalidateQueries({ queryKey: ['exhibitor-stats'] });
    },
  });
};

// Update PV installer status mutation
export const useUpdatePVStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      exhibitorId,
      isPVInstaller,
    }: {
      exhibitorId: string;
      isPVInstaller: boolean;
    }) => {
      const response = await axios.post('/api/exhibitors/update-pv-status', {
        exhibitorId,
        isPVInstaller,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exhibitors'] });
      queryClient.invalidateQueries({ queryKey: ['exhibitor-stats'] });
    },
  });
};

export const useRecognizePVInstallers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/recognize-pv-installers');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognize-pv-status'] });
    },
  });
};

export const useRecognizePVStatus = () => {
  return useQuery({
    queryKey: ['recognize-pv-status'],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; job: RecognizePVJobStatus }>('/api/recognize-pv-installers');
      return response.data.job;
    },
    refetchInterval: (query) => {
      const status = query.state.data;
      return status?.state === 'running' ? 2000 : false;
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
};
