// @ts-nocheck
import { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallStatus, CallType } from '@/hooks/useWebRTC';

interface CallUIProps {
  status: CallStatus;
  callType: CallType;
  remotePeerName: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export const CallUI = ({
  status,
  callType,
  remotePeerName,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo
}: CallUIProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
            {remotePeerName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-foreground">{remotePeerName || 'Đang gọi...'}</p>
            <p className="text-sm text-muted-foreground">
              {status === 'calling' && 'Đang gọi...'}
              {status === 'ringing' && 'Cuộc gọi đến...'}
              {status === 'connected' && (callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onEnd}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-muted/50">
        {callType === 'video' && status === 'connected' ? (
          <>
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 rounded-lg overflow-hidden shadow-lg border-2 border-border">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
          </>
        ) : (
          /* Audio Call UI */
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className={`w-32 h-32 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center ${status === 'calling' || status === 'ringing' ? 'animate-pulse' : ''}`}>
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-4xl font-bold text-primary-foreground">
                  {remotePeerName?.charAt(0).toUpperCase() || '?'}
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">{remotePeerName}</h2>
              <p className="text-muted-foreground">
                {status === 'calling' && 'Đang gọi...'}
                {status === 'ringing' && 'Cuộc gọi đến...'}
                {status === 'connected' && 'Đã kết nối'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-border">
        <div className="flex items-center justify-center gap-4">
          {status === 'ringing' ? (
            <>
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
                onClick={onReject}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button
                variant="default"
                size="lg"
                className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
                onClick={onAccept}
              >
                <Phone className="w-6 h-6" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant={isMuted ? 'destructive' : 'secondary'}
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={onToggleMute}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              
              {callType === 'video' && (
                <Button
                  variant={isVideoOff ? 'destructive' : 'secondary'}
                  size="lg"
                  className="rounded-full w-14 h-14"
                  onClick={onToggleVideo}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </Button>
              )}
              
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
                onClick={onEnd}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
