// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './useChat';

export const useMessages = (chatId: string | null, userId: string | undefined) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          console.log('New message:', payload);
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => 
            prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const deletedMessage = payload.old as ChatMessage;
          setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const sendMessage = async (content: string, selfDestructMinutes?: number) => {
    if (!chatId || !userId || !content.trim()) return;

    try {
      const selfDestructAt = selfDestructMinutes 
        ? new Date(Date.now() + selfDestructMinutes * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: userId,
          content: content.trim(),
          status: 'sent',
          self_destruct_at: selfDestructAt
        })
        .select()
        .single();

      if (error) throw error;

      // Message will be added via realtime subscription
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Lỗi",
        description: "Không thể gửi tin nhắn",
        variant: "destructive"
      });
    }
  };

  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    try {
      if (forEveryone) {
        const { error } = await supabase
          .from('messages')
          .update({ 
            is_deleted: true, 
            deleted_for_everyone: true,
            content: null 
          })
          .eq('id', messageId);

        if (error) throw error;
      } else {
        // For "delete for me only", we'd need a separate table
        // For now, just mark as deleted
        const { error } = await supabase
          .from('messages')
          .update({ is_deleted: true })
          .eq('id', messageId);

        if (error) throw error;
      }

      setMessages(prev => 
        prev.map(m => 
          m.id === messageId 
            ? { ...m, is_deleted: true, deleted_for_everyone: forEveryone }
            : m
        )
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa tin nhắn",
        variant: "destructive"
      });
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('id', messageId)
        .neq('sender_id', userId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    markAsRead,
    fetchMessages
  };
};
