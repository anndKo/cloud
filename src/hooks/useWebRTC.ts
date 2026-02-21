// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

interface CallState {
  status: CallStatus;
  callId: string | null;
  callType: CallType;
  remotePeerId: string | null;
  remotePeerName: string | null;
  isInitiator: boolean;
}

interface UseWebRTCProps {
  userId: string;
  userName: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const useWebRTC = ({ userId, userName }: UseWebRTCProps) => {
  const { toast } = useToast();
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    callId: null,
    callType: 'audio',
    remotePeerId: null,
    remotePeerName: null,
    isInitiator: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);

  // Connect to signaling server
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `wss://deyehtgphvhmpvtfkcrh.functions.supabase.co/functions/v1/webrtc-signaling?userId=${userId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data.type, data);
      await handleSignalingMessage(data);
    };

    wsRef.current = ws;
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      cleanup();
    };
  }, [connect]);

  const handleSignalingMessage = async (data: any) => {
    switch (data.type) {
      case 'incoming-call':
        setCallState({
          status: 'ringing',
          callId: data.callId,
          callType: data.callType,
          remotePeerId: data.callerId,
          remotePeerName: data.callerName,
          isInitiator: false
        });
        break;

      case 'call-ringing':
        setCallState(prev => ({
          ...prev,
          status: 'calling',
          callId: data.callId
        }));
        break;

      case 'call-accepted':
        await createOffer();
        break;

      case 'call-rejected':
        toast({
          title: "Cuộc gọi bị từ chối",
          variant: "destructive"
        });
        cleanup();
        break;

      case 'call-ended':
        toast({
          title: "Cuộc gọi đã kết thúc"
        });
        cleanup();
        break;

      case 'call-error':
        toast({
          title: "Lỗi cuộc gọi",
          description: data.message,
          variant: "destructive"
        });
        cleanup();
        break;

      case 'offer':
        await handleOffer(data);
        break;

      case 'answer':
        await handleAnswer(data);
        break;

      case 'ice-candidate':
        await handleIceCandidate(data);
        break;
    }
  };

  const setupPeerConnection = async (callType: CallType) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          targetId: callState.remotePeerId,
          candidate: event.candidate.toJSON()
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote track received');
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState(prev => ({ ...prev, status: 'connected' }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        cleanup();
      }
    };

    // Get local media
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      if (callType === 'video') {
        constraints.video = {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    } catch (error) {
      console.error('Error getting media:', error);
      toast({
        title: "Lỗi truy cập thiết bị",
        description: "Không thể truy cập microphone hoặc camera",
        variant: "destructive"
      });
      throw error;
    }

    pcRef.current = pc;
    return pc;
  };

  const createOffer = async () => {
    try {
      const pc = await setupPeerConnection(callState.callType);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Add any pending candidates
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidates.current = [];

      wsRef.current?.send(JSON.stringify({
        type: 'offer',
        targetId: callState.remotePeerId,
        sdp: offer.sdp
      }));
    } catch (error) {
      console.error('Error creating offer:', error);
      cleanup();
    }
  };

  const handleOffer = async (data: any) => {
    try {
      const pc = await setupPeerConnection(callState.callType);
      
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: data.sdp
      }));

      // Add any pending candidates
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsRef.current?.send(JSON.stringify({
        type: 'answer',
        targetId: data.senderId,
        sdp: answer.sdp
      }));

      setCallState(prev => ({
        ...prev,
        remotePeerId: data.senderId,
        status: 'connected'
      }));
    } catch (error) {
      console.error('Error handling offer:', error);
      cleanup();
    }
  };

  const handleAnswer = async (data: any) => {
    try {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: data.sdp
        }));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (data: any) => {
    try {
      const candidate = new RTCIceCandidate(data.candidate);
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(candidate);
      } else {
        pendingCandidates.current.push(candidate);
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const startCall = (targetId: string, targetName: string, callType: CallType) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Không thể kết nối",
        description: "Vui lòng thử lại sau",
        variant: "destructive"
      });
      return;
    }

    setCallState({
      status: 'calling',
      callId: null,
      callType,
      remotePeerId: targetId,
      remotePeerName: targetName,
      isInitiator: true
    });

    wsRef.current.send(JSON.stringify({
      type: 'call-request',
      targetId,
      callerName: userName,
      callType
    }));
  };

  const acceptCall = async () => {
    if (!callState.callId) return;

    wsRef.current?.send(JSON.stringify({
      type: 'call-accept',
      callId: callState.callId
    }));

    setCallState(prev => ({ ...prev, status: 'connected' }));
  };

  const rejectCall = () => {
    if (!callState.callId) return;

    wsRef.current?.send(JSON.stringify({
      type: 'call-reject',
      callId: callState.callId
    }));

    cleanup();
  };

  const endCall = () => {
    if (callState.callId) {
      wsRef.current?.send(JSON.stringify({
        type: 'call-end',
        callId: callState.callId
      }));
    }
    cleanup();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const cleanup = () => {
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    pcRef.current?.close();
    
    setLocalStream(null);
    setRemoteStream(null);
    pcRef.current = null;
    pendingCandidates.current = [];
    
    setCallState({
      status: 'idle',
      callId: null,
      callType: 'audio',
      remotePeerId: null,
      remotePeerName: null,
      isInitiator: false
    });
    setIsMuted(false);
    setIsVideoOff(false);
  };

  return {
    callState,
    isConnected,
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
  };
};
