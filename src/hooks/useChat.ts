// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from './useAuth';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  is_deleted: boolean;
  deleted_for_everyone: boolean;
  self_destruct_at: string | null;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  is_blocked: boolean;
  notifications_enabled: boolean;
  profile?: Profile;
}

export interface ChatData {
  id: string;
  created_at: string;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export const useChat = (userId: string | undefined) => {
  const [chats, setChats] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchChats = useCallback(async () => {
    if (!userId) return;

    try {
      // Get all chats the user participates in
      const { data: participations, error: partError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      const chatIds = participations.map(p => p.chat_id);

      // Get chat details with all participants
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds);

      if (chatsError) throw chatsError;

      // Get all participants for these chats
      const { data: allParticipants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('*')
        .in('chat_id', chatIds);

      if (participantsError) throw participantsError;

      // Get profiles for all participants
      const participantUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', participantUserIds);

      if (profilesError) throw profilesError;

      // Get last message for each chat
      const chatDataPromises = (chatsData || []).map(async (chat) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const participants = (allParticipants || [])
          .filter(p => p.chat_id === chat.id)
          .map(p => ({
            ...p,
            profile: profiles?.find(pr => pr.id === p.user_id) as Profile | undefined
          }));

        return {
          id: chat.id,
          created_at: chat.created_at,
          participants,
          lastMessage: messages?.[0] as ChatMessage | undefined,
          unreadCount: 0
        };
      });

      const resolvedChats = await Promise.all(chatDataPromises);
      setChats(resolvedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Subscribe to realtime updates for messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Message change:', payload);
          fetchChats(); // Refresh chats when messages change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchChats]);

  const findUserByUserId = async (searchUserId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', searchUserId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  };

  const startNewChat = async (otherUserAuthId: string): Promise<string | null> => {
    if (!userId) return null;

    if (otherUserAuthId === userId) {
      toast({
        title: "Không hợp lệ",
        description: "Bạn không thể tạo cuộc trò chuyện với chính mình",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Check if chat already exists between these users
      const existingChat = chats.find(chat =>
        chat.participants.some(p => p.user_id === otherUserAuthId)
      );

      if (existingChat) {
        return existingChat.id;
      }

      // Generate chat ID on client side to avoid RLS SELECT issue
      const newChatId = uuidv4();

      // 1) Create chat
      const { error: chatError } = await supabase
        .from('chats')
        .insert({ id: newChatId });

      if (chatError) {
        console.error('Error creating chat:', chatError);
        throw chatError;
      }

      // 2) Add current user first (required so we become a participant)
      const { error: addSelfError } = await supabase
        .from('chat_participants')
        .insert({ chat_id: newChatId, user_id: userId });

      if (addSelfError) {
        console.error('Error adding self participant:', addSelfError);
        // Best-effort cleanup (may be blocked by RLS if we failed before becoming participant)
        try {
          await supabase.from('chats').delete().eq('id', newChatId);
        } catch (_) {
          // ignore
        }
        throw addSelfError;
      }

      // 3) Now we can add the other participant (policy allows chat members to add participants)
      const { error: addOtherError } = await supabase
        .from('chat_participants')
        .insert({ chat_id: newChatId, user_id: otherUserAuthId });

      if (addOtherError) {
        console.error('Error adding other participant:', addOtherError);
        // Cleanup: remove chat (should be allowed now because we are a participant)
        try {
          await supabase.from('chats').delete().eq('id', newChatId);
        } catch (_) {
          // ignore
        }
        throw addOtherError;
      }

      await fetchChats();
      return newChatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo cuộc trò chuyện",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      setChats(prev => prev.filter(c => c.id !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa cuộc trò chuyện",
        variant: "destructive"
      });
    }
  };

  return {
    chats,
    loading,
    fetchChats,
    findUserByUserId,
    startNewChat,
    deleteChat
  };
};
