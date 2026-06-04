import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';

// Helper to check if user is currently logged in via token
const isLoggedIn = () => Boolean(localStorage.getItem('token'));

/** Fetch Current User Profile */
export const useAuthMe = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/auth/me');
      return data.user;
    },
    enabled: isLoggedIn(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry if 401
  });
};

/** Fetch Unread Notifications */
export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/notifications');
      return data.notifications || [];
    },
    enabled: isLoggedIn(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
  });
};

/** Fetch Published FAQs */
export const usePublishedFaqs = () => {
  return useQuery({
    queryKey: ['faqs', 'published'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/faqs?status=published');
      return data.faqs || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/** Fetch FAQ Categories */
export const useFaqCategories = () => {
  return useQuery({
    queryKey: ['faqs', 'categories'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/faqs/categories');
      return data.categories || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/** Fetch Discussion Clusters (only for logged-in users) */
export const useDiscussionClusters = () => {
  return useQuery({
    queryKey: ['discussions', 'clusters'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/discussions/clusters');
      return data.clusters || [];
    },
    enabled: isLoggedIn(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
