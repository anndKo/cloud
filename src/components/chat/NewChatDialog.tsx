// @ts-nocheck
import { useState } from 'react';
import { X, Search, UserPlus, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Profile } from '@/hooks/useAuth';

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (profile: Profile) => void;
  findUserByUserId: (userId: string) => Promise<Profile | null>;
}

export const NewChatDialog = ({ isOpen, onClose, onStartChat, findUserByUserId }: NewChatDialogProps) => {
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    
    setIsSearching(true);
    setError('');
    setFoundUser(null);

    try {
      // Search for real user in database
      const profile = await findUserByUserId(searchId.trim());
      
      if (profile) {
        setFoundUser(profile);
      } else {
        setError('Tài khoản không tồn tại hoặc chưa đăng ký');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi tìm kiếm');
    }

    setIsSearching(false);
  };

  const handleStartChat = () => {
    if (foundUser) {
      onStartChat(foundUser);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchId('');
    setFoundUser(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md glass-strong rounded-2xl shadow-lg animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Cuộc trò chuyện mới</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Fingerprint className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">
              Nhập ID người dùng để bắt đầu trò chuyện bảo mật
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Nhập ID người dùng..."
                className="font-mono tracking-wider"
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={handleSearch}
                variant="glow"
                disabled={!searchId.trim() || isSearching}
              >
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-in">
                {error}
              </div>
            )}

            {foundUser && (
              <div className="p-4 rounded-xl glass animate-in">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
                    {(foundUser.display_name || foundUser.user_id).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{foundUser.display_name || foundUser.user_id}</p>
                    <p className="text-sm text-muted-foreground font-mono">{foundUser.user_id}</p>
                    <p className={`text-xs ${foundUser.is_online ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {foundUser.is_online ? '● Trực tuyến' : '○ Ngoại tuyến'}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleStartChat}
                  variant="gradient"
                  className="w-full mt-4"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Bắt đầu trò chuyện
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
