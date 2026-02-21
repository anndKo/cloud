// @ts-nocheck
import { useState, useMemo } from 'react';
import { Menu, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { UserInfoPanel } from './UserInfoPanel';
import { NewChatDialog } from './NewChatDialog';
import { CallUI } from '@/components/call/CallUI';
import { StoragePage } from '@/components/storage/StoragePage';
import { useChat } from '@/hooks/useChat';
import { useMessages } from '@/hooks/useMessages';
import { useUserActions } from '@/hooks/useUserActions';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useWebRTC, CallType } from '@/hooks/useWebRTC';
import { Profile } from '@/hooks/useAuth';

interface ChatLayoutProps {
  currentUserId: string;
  currentProfile: Profile;
  onLogout: () => void;
}

export const ChatLayout = ({ currentUserId, currentProfile, onLogout }: ChatLayoutProps) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [selfDestructMinutes, setSelfDestructMinutes] = useState<number | undefined>(undefined);

  const { chats, loading: chatsLoading, findUserByUserId, startNewChat, deleteChat, fetchChats } = useChat(currentUserId);
  const { messages, loading: messagesLoading, sendMessage, deleteMessage } = useMessages(selectedChatId, currentUserId);
  const { blockUser, reportUser } = useUserActions(currentUserId);

  // WebRTC for calls
  const {
    callState,
    isConnected: isWebRTCConnected,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useWebRTC({
    userId: currentUserId,
    userName: currentProfile.display_name || currentProfile.user_id
  });

  // Get all participant user IDs for online status tracking
  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    chats.forEach(chat => {
      chat.participants.forEach(p => {
        if (p.user_id !== currentUserId) {
          ids.add(p.user_id);
        }
      });
    });
    return Array.from(ids);
  }, [chats, currentUserId]);

  const onlineStatus = useOnlineStatus(participantIds);

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const otherParticipant = selectedChat?.participants.find(p => p.user_id !== currentUserId);
  const otherProfile = otherParticipant?.profile;

  const handleSendMessage = async (content: string) => {
    await sendMessage(content, selfDestructMinutes);
  };

  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    await deleteMessage(messageId, forEveryone);
  };

  const handleStartNewChat = async (foundProfile: Profile) => {
    const chatId = await startNewChat(foundProfile.id);
    if (chatId) {
      setSelectedChatId(chatId);
      setShowMobileSidebar(false);
    }
  };

  const handleBlockUser = async () => {
    if (otherParticipant) {
      await blockUser(otherParticipant.user_id);
      setSelectedChatId(null);
      setShowUserInfo(false);
    }
  };

  const handleReportUser = async (reason: string, description?: string) => {
    if (otherParticipant) {
      await reportUser(otherParticipant.user_id, reason, description);
    }
  };

  const handleDeleteChat = async () => {
    if (selectedChatId) {
      await deleteChat(selectedChatId);
      setSelectedChatId(null);
      setShowUserInfo(false);
    }
  };

  const handleToggleSelfDestruct = (minutes?: number) => {
    setSelfDestructMinutes(minutes);
  };

  const handleStartCall = (callType: CallType) => {
    if (otherProfile) {
      startCall(otherProfile.id, otherProfile.display_name || otherProfile.user_id, callType);
    }
  };

  // If showing storage, render StoragePage
  if (showStorage) {
    return (
      <div className="h-screen">
        <StoragePage userId={currentUserId} onBack={() => setShowStorage(false)} />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="fixed top-4 left-4 z-50 lg:hidden"
      >
        {showMobileSidebar ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-300 lg:relative lg:translate-x-0
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <ChatList
          chats={chats}
          currentUserId={currentUserId}
          currentProfile={currentProfile}
          selectedChatId={selectedChatId}
          onlineStatus={onlineStatus}
          onSelectChat={(id) => {
            setSelectedChatId(id);
            setShowMobileSidebar(false);
          }}
          onNewChat={() => setShowNewChatDialog(true)}
          onLogout={onLogout}
          onOpenStorage={() => setShowStorage(true)}
          loading={chatsLoading}
        />
      </div>

      {/* Mobile overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex">
        {selectedChat && otherProfile ? (
          <>
            {/* Chat window */}
            <div className="flex-1 relative">
              <ChatWindow
                chatId={selectedChatId!}
                otherProfile={otherProfile}
                isOnline={onlineStatus[otherProfile.id] || false}
                messages={messages}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
                onStartCall={handleStartCall}
                selfDestructMinutes={selfDestructMinutes}
                loading={messagesLoading}
              />
              
              {/* Info toggle button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUserInfo(!showUserInfo)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground lg:hidden"
              >
                <Info className="w-5 h-5" />
              </Button>
            </div>

            {/* User info panel */}
            <div className={`
              fixed inset-y-0 right-0 z-40 w-80 transform transition-transform duration-300 lg:relative lg:translate-x-0
              ${showUserInfo ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
              ${showUserInfo ? '' : 'lg:hidden xl:block'}
            `}>
              <UserInfoPanel
                otherProfile={otherProfile}
                isOnline={onlineStatus[otherProfile.id] || false}
                selfDestructMinutes={selfDestructMinutes}
                onClose={() => setShowUserInfo(false)}
                onDeleteChat={handleDeleteChat}
                onBlockUser={handleBlockUser}
                onReportUser={handleReportUser}
                onToggleSelfDestruct={handleToggleSelfDestruct}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-24 h-24 rounded-2xl bg-gradient-primary mx-auto mb-6 flex items-center justify-center shadow-glow">
                <svg className="w-12 h-12 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Chào mừng đến SecureChat</h2>
              <p className="text-muted-foreground mb-6">
                Chọn một cuộc trò chuyện hoặc bắt đầu cuộc trò chuyện mới
              </p>
              <Button variant="gradient" onClick={() => setShowNewChatDialog(true)}>
                Bắt đầu trò chuyện
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New chat dialog */}
      <NewChatDialog
        isOpen={showNewChatDialog}
        onClose={() => setShowNewChatDialog(false)}
        onStartChat={handleStartNewChat}
        findUserByUserId={findUserByUserId}
      />

      {/* Call UI */}
      {callState.status !== 'idle' && (
        <CallUI
          status={callState.status}
          callType={callState.callType}
          remotePeerName={callState.remotePeerName}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}
    </div>
  );
};
