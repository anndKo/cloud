// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useUserActions = (userId: string | undefined) => {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  const blockUser = async (blockedId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: userId,
          blocked_id: blockedId
        });

      if (error) throw error;

      setBlockedUsers(prev => [...prev, blockedId]);
      toast({
        title: "Đã chặn",
        description: "Người dùng đã bị chặn thành công"
      });
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: "Thông báo",
          description: "Người dùng này đã bị chặn trước đó"
        });
      } else {
        console.error('Error blocking user:', error);
        toast({
          title: "Lỗi",
          description: "Không thể chặn người dùng",
          variant: "destructive"
        });
      }
    }
  };

  const unblockUser = async (blockedId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', blockedId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(id => id !== blockedId));
      toast({
        title: "Đã bỏ chặn",
        description: "Người dùng đã được bỏ chặn"
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Lỗi",
        description: "Không thể bỏ chặn người dùng",
        variant: "destructive"
      });
    }
  };

  const reportUser = async (reportedId: string, reason: string, description?: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: userId,
          reported_id: reportedId,
          reason,
          description
        });

      if (error) throw error;

      toast({
        title: "Đã báo cáo",
        description: "Báo cáo của bạn đã được gửi. Chúng tôi sẽ xem xét sớm nhất."
      });
    } catch (error) {
      console.error('Error reporting user:', error);
      toast({
        title: "Lỗi",
        description: "Không thể gửi báo cáo",
        variant: "destructive"
      });
    }
  };

  const fetchBlockedUsers = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', userId);

      if (error) throw error;

      setBlockedUsers(data?.map(b => b.blocked_id) || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  return {
    blockedUsers,
    blockUser,
    unblockUser,
    reportUser,
    fetchBlockedUsers
  };
};
