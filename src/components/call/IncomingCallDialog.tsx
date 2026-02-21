// @ts-nocheck
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallType } from '@/hooks/useWebRTC';

interface IncomingCallDialogProps {
  callerName: string;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog = ({
  callerName,
  callType,
  onAccept,
  onReject
}: IncomingCallDialogProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <div className="relative w-full max-w-sm glass-strong rounded-2xl shadow-lg p-6 animate-fade-in-up">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {callerName.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-1">{callerName}</h2>
          <p className="text-muted-foreground mb-6 flex items-center justify-center gap-2">
            {callType === 'video' ? (
              <>
                <Video className="w-4 h-4" />
                Cuộc gọi video đến
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Cuộc gọi thoại đến
              </>
            )}
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={onReject}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 text-white"
              onClick={onAccept}
            >
              {callType === 'video' ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
