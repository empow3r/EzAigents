import { useState, useCallback, useRef, useEffect } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC(roomId = 'default-room') {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const peerConnections = useRef({});
  const signalingSocket = useRef(null);

  useEffect(() => {
    // Initialize WebSocket for signaling
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');
    signalingSocket.current = ws;

    ws.onopen = () => {
      console.log('Connected to signaling server');
      ws.send(JSON.stringify({ type: 'join', roomId }));
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await handleSignalingMessage(message);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      console.log('Disconnected from signaling server');
      setConnectionStatus('disconnected');
    };

    return () => {
      endCall();
      ws.close();
    };
  }, [roomId]);

  const handleSignalingMessage = async (message) => {
    const { type, from, data } = message;

    switch (type) {
      case 'offer':
        await handleOffer(from, data);
        break;
      case 'answer':
        await handleAnswer(from, data);
        break;
      case 'ice-candidate':
        await handleIceCandidate(from, data);
        break;
      case 'user-left':
        handleUserLeft(from);
        break;
    }
  };

  const createPeerConnection = (userId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          to: userId,
          data: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote stream from', userId);
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.id === userId);
        if (existing) {
          return prev.map(s => s.id === userId ? event.streams[0] : s);
        }
        return [...prev, event.streams[0]];
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      }
    };

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    peerConnections.current[userId] = pc;
    return pc;
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);
      setConnectionStatus('connecting');

      // Notify other users that we're ready to receive calls
      sendSignalingMessage({
        type: 'ready-to-call',
        data: { userId: 'current-user' }
      });

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setConnectionStatus('error');
      throw error;
    }
  };

  const makeCall = async (userId) => {
    const pc = createPeerConnection(userId);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      sendSignalingMessage({
        type: 'offer',
        to: userId,
        data: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async (from, offer) => {
    const pc = createPeerConnection(from);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      sendSignalingMessage({
        type: 'answer',
        to: from,
        data: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (from, answer) => {
    const pc = peerConnections.current[from];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  };

  const handleIceCandidate = async (from, candidate) => {
    const pc = peerConnections.current[from];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  const handleUserLeft = (userId) => {
    const pc = peerConnections.current[userId];
    if (pc) {
      pc.close();
      delete peerConnections.current[userId];
    }
    
    setRemoteStreams(prev => prev.filter(s => s.id !== userId));
  };

  const endCall = useCallback(() => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Close all peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};

    // Clear remote streams
    setRemoteStreams([]);
    setConnectionStatus('disconnected');

    // Notify others
    sendSignalingMessage({
      type: 'user-left',
      data: { userId: 'current-user' }
    });
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      const videoTrack = screenStream.getVideoTracks()[0];
      
      // Replace video track in all peer connections
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Replace in local stream
      const oldVideoTrack = localStream.getVideoTracks()[0];
      localStream.removeTrack(oldVideoTrack);
      localStream.addTrack(videoTrack);

      videoTrack.onended = () => {
        // Restore camera when screen sharing ends
        restoreCamera();
      };

      return true;
    } catch (error) {
      console.error('Error sharing screen:', error);
      return false;
    }
  };

  const restoreCamera = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      const videoTrack = cameraStream.getVideoTracks()[0];
      
      // Replace track in all connections
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      const oldVideoTrack = localStream.getVideoTracks()[0];
      localStream.removeTrack(oldVideoTrack);
      localStream.addTrack(videoTrack);
    } catch (error) {
      console.error('Error restoring camera:', error);
    }
  };

  const sendSignalingMessage = (message) => {
    if (signalingSocket.current?.readyState === WebSocket.OPEN) {
      signalingSocket.current.send(JSON.stringify(message));
    }
  };

  return {
    localStream,
    remoteStreams,
    startCall,
    endCall,
    makeCall,
    toggleAudio,
    toggleVideo,
    shareScreen,
    isAudioEnabled,
    isVideoEnabled,
    connectionStatus
  };
}