// @ts-nocheck
import { useState } from 'react';
import { 
  X, Lock, Shield, Bell, BellOff, Trash2, 
  Copy, Check, Timer, Ban, Flag, KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Profile } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface UserInfoPanelProps {
  otherProfile: Profile;
  isOnline: boolean;
  selfDestructMinutes?: number;
  onClose: () => void;
  onDeleteChat: () => void;
  onBlockUser: () => void;
  onReportUser: (reason: string, description?: string) => void;
  onToggleSelfDestruct: (minutes?: number) => void;
}

export const UserInfoPanel = ({ 
  otherProfile, 
  isOnline,
  selfDestructMinutes,
  onClose, 
  onDeleteChat, 
  onBlockUser,
  onReportUser,
  onToggleSelfDestruct 
}: UserInfoPanelProps) => {
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displayName = otherProfile.display_name || otherProfile.user_id;

  const copyId = () => {
    navigator.clipboard.writeText(otherProfile.user_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReport = () => {
    if (reportReason.trim()) {
      onReportUser(reportReason.trim(), reportDescription.trim() || undefined);
      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
    }
  };

  const selfDestructOptions = [
    { label: 'Tắt', value: undefined },
    { label: '1 phút', value: 1 },
    { label: '5 phút', value: 5 },
    { label: '30 phút', value: 30 },
    { label: '1 giờ', value: 60 },
    { label: '24 giờ', value: 1440 },
  ];

  return (
    <>
      <div className="h-full flex flex-col bg-sidebar border-l border-sidebar-border">
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-sidebar-border">
          <h2 className="font-semibold text-foreground">Thông tin</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Profile */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              {isOnline && (
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-success rounded-full border-4 border-sidebar" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-1">{displayName}</h3>
            <button 
              onClick={copyId}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mono"
            >
              {otherProfile.user_id}
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
            <p className="text-sm text-muted-foreground mt-2">
              {isOnline ? (
                <span className="text-success">Đang hoạt động</span>
              ) : (
                `Hoạt động lần cuối: ${otherProfile.last_seen ? 'Gần đây' : 'Không xác định'}`
              )}
            </p>
          </div>

          {/* Security info */}
          <div className="glass rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Mã hóa đầu cuối</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tin nhắn trong cuộc trò chuyện này được bảo vệ bằng mã hóa E2E. 
                  Chỉ bạn và {displayName} mới có thể đọc được.
                </p>
              </div>
            </div>
          </div>

          {/* Encryption details */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bảo mật</h4>
            
            <div className="flex items-center gap-3 p-3 glass rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-foreground">AES-256</p>
                <p className="text-xs text-muted-foreground">Mã hóa tin nhắn</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 glass rounded-lg">
              <KeyRound className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-foreground">RSA-2048</p>
                <p className="text-xs text-muted-foreground">Trao đổi khóa</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tùy chọn</h4>
            
            <button 
              onClick={() => setNotifications(!notifications)}
              className="flex items-center gap-3 w-full p-3 glass rounded-lg hover:bg-secondary/50 transition-colors"
            >
              {notifications ? (
                <Bell className="w-5 h-5 text-muted-foreground" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="flex-1 text-left text-sm text-foreground">Thông báo</span>
              <div className={`w-10 h-6 rounded-full transition-colors ${notifications ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${notifications ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* Self destruct toggle */}
            <div className="p-3 glass rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Timer className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 text-left text-sm text-foreground">Tin nhắn tự hủy</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selfDestructOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => onToggleSelfDestruct(option.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      selfDestructMinutes === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-destructive/80 uppercase tracking-wider">Nguy hiểm</h4>
            
            <button 
              onClick={() => setShowBlockConfirm(true)}
              className="flex items-center gap-3 w-full p-3 rounded-lg border border-destructive/30 hover:bg-destructive/10 transition-colors"
            >
              <Ban className="w-5 h-5 text-destructive" />
              <span className="flex-1 text-left text-sm text-destructive">Chặn người dùng</span>
            </button>

            <button 
              onClick={() => setShowReportDialog(true)}
              className="flex items-center gap-3 w-full p-3 rounded-lg border border-destructive/30 hover:bg-destructive/10 transition-colors"
            >
              <Flag className="w-5 h-5 text-destructive" />
              <span className="flex-1 text-left text-sm text-destructive">Báo cáo</span>
            </button>

            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 w-full p-3 rounded-lg border border-destructive/30 hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="flex-1 text-left text-sm text-destructive">Xóa cuộc trò chuyện</span>
            </button>
          </div>
        </div>
      </div>

      {/* Block confirmation dialog */}
      <Dialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chặn người dùng</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn chặn {displayName}? Họ sẽ không thể gửi tin nhắn cho bạn nữa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockConfirm(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={() => { onBlockUser(); setShowBlockConfirm(false); }}>
              Chặn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa cuộc trò chuyện</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={() => { onDeleteChat(); setShowDeleteConfirm(false); }}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo cáo người dùng</DialogTitle>
            <DialogDescription>
              Vui lòng cho chúng tôi biết lý do bạn muốn báo cáo {displayName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do *</label>
              <Input
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Spam, quấy rối, nội dung không phù hợp..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả chi tiết (tùy chọn)</label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Thêm thông tin chi tiết..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleReport} disabled={!reportReason.trim()}>
              Gửi báo cáo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
