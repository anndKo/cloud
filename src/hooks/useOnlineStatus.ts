// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from './useAuth';

export const useOnlineStatus = (userIds: string[]) => {
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

  const fetchOnlineStatus = useCallback(async () => {
    if (userIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_online')
        .in('id', userIds);

      if (error) throw error;

      const statusMap: Record<string, boolean> = {};
      data?.forEach(profile => {
        statusMap[profile.id] = profile.is_online;
      });
      setOnlineStatus(statusMap);
    } catch (error) {
      console.error('Error fetching online status:', error);
    }
  }, [userIds]);

  useEffect(() => {
    fetchOnlineStatus();
  }, [fetchOnlineStatus]);

  // Subscribe to profile changes for online status
  useEffect(() => {
    if (userIds.length === 0) return;

    const channel = supabase
      .channel('online-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          const updatedProfile = payload.new as Profile;
          if (userIds.includes(updatedProfile.id)) {
            setOnlineStatus(prev => ({
              ...prev,
              [updatedProfile.id]: updatedProfile.is_online
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userIds]);

  return onlineStatus;
};
