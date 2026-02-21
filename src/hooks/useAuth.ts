// @ts-nocheck
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away';
  is_online: boolean;
  last_seen: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            updateOnlineStatus(session.user.id, true);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        updateOnlineStatus(session.user.id, true);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
    }
  };

  const updateOnlineStatus = async (userId: string, isOnline: boolean) => {
    await supabase.rpc('update_user_status', { 
      p_user_id: userId, 
      p_is_online: isOnline 
    });
  };

  const signUp = async (userId: string, password: string) => {
    const email = `${userId.toLowerCase().replace(/[^a-z0-9]/g, '')}@securechat.local`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          user_id: userId,
          display_name: userId
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: "Lỗi đăng ký",
          description: "ID này đã được sử dụng. Vui lòng chọn ID khác.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Lỗi đăng ký",
          description: error.message,
          variant: "destructive"
        });
      }
      return { error };
    }

    toast({
      title: "Đăng ký thành công",
      description: "Chào mừng bạn đến với SecureChat!"
    });

    return { data, error: null };
  };

  const signIn = async (userId: string, password: string) => {
    const email = `${userId.toLowerCase().replace(/[^a-z0-9]/g, '')}@securechat.local`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: "Lỗi đăng nhập",
        description: "ID hoặc mật khẩu không đúng",
        variant: "destructive"
      });
      return { error };
    }

    return { data, error: null };
  };

  const signOut = async () => {
    if (user) {
      await updateOnlineStatus(user.id, false);
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể đăng xuất",
        variant: "destructive"
      });
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut
  };
};
