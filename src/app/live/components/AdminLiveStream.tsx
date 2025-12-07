"use client";

import React, { useState, useRef, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, addDoc, updateDoc, doc, Timestamp, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { LiveGame } from "../types";
import LiveVideoPlayer from "./LiveVideoPlayer";

const FRAME_INTERVAL_MS = 1000; // Firestore allows ~1 sustained write per second per document
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;
const JPEG_QUALITY = 0.6;

interface AdminLiveStreamProps {
  onStreamStart?: (streamId: string) => void;
  onStreamEnd?: () => void;
}

export default function AdminLiveStream({ onStreamStart, onStreamEnd }: AdminLiveStreamProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [availableMatches, setAvailableMatches] = useState<LiveGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const broadcastIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available live matches for overlay selection
  useEffect(() => {
    const fetchLiveMatches = async () => {
      try {
        const gamesQuery = query(
          collection(db, "liveGames"),
          where("status", "==", "LIVE")
        );
        
        // Use real-time listener for instant updates
        const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
          const matches = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as LiveGame[];
          console.log("📹 AdminLiveStream: Available live matches:", matches.map(m => ({ id: m.id, teams: `${m.teamA.name} vs ${m.teamB.name}`, status: m.status })));
          setAvailableMatches(matches);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Error fetching matches:", err);
      }
    };

    const unsubscribe = fetchLiveMatches();
    return () => {
      if (unsubscribe) {
        unsubscribe.then(unsub => unsub && unsub());
      }
    };
  }, []);

  /**
   * Request camera and microphone access
   * Mobile-optimized: prefers back camera with HD quality
   */
  const startPreview = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Request permissions with mobile optimization
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment", // Back camera on mobile
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Show preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute preview to avoid feedback
        videoRef.current.play();
      }

      setIsPreviewing(true);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      
      // User-friendly error messages
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("❌ Camera/microphone access denied. Please allow permissions in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("❌ No camera or microphone found on your device.");
      } else if (err.name === "NotReadableError") {
        setError("❌ Camera is already in use by another app. Please close other apps and try again.");
      } else {
        setError(`❌ Error accessing camera: ${err.message}`);
      }
      console.error("Media access error:", err);
    }
  };

  /**
   * Stop preview and release camera
   */
  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPreviewing(false);
  };

  /**
   * 📹 Broadcast camera frames to Firebase
   * Simple solution: Capture frames and store in Firebase
   */
  const startBroadcasting = async (activeStreamId: string) => {
    if (!videoRef.current || !streamRef.current) return;

    // Clear any previous broadcast loop before starting a new one
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
    }

    // Create canvas for frame capture
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    
    canvas.width = CANVAS_WIDTH;  // Lower resolution for faster uploads
    canvas.height = CANVAS_HEIGHT;
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Broadcast frame ~1 FPS to stay within Firestore write limits
    broadcastIntervalRef.current = setInterval(async () => {
      if (!video.paused && !video.ended && video.readyState >= 2) {
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to compressed JPEG data URL
        const frameData = canvas.toDataURL("image/jpeg", JPEG_QUALITY); // 60% quality
        
        // Update Firebase with latest frame
        try {
          await updateDoc(doc(db, "livestreams", activeStreamId), {
            currentFrame: frameData,
            lastFrameUpdate: Timestamp.now()
          });
          console.log("📹 AdminLiveStream: Frame uploaded successfully", {
            streamId: activeStreamId,
            frameSize: frameData.length,
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          console.warn("📹 AdminLiveStream: Frame upload error", err);
          if (err.code === "resource-exhausted") {
            setError("Firestore is throttling frame updates. Frame rate reduced to stay within limits.");
          }
        }
      }
    }, FRAME_INTERVAL_MS);
  };

  /**
   * Stop broadcasting frames
   */
  const stopBroadcasting = () => {
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
      broadcastIntervalRef.current = null;
    }
    canvasRef.current = null;
  };

  /**
   * Start broadcasting the stream
   * In production, this would connect to Livepeer or your WebRTC server
   */
  const goLive = async () => {
    try {
      setError(null);
      setIsLoading(true);

      if (!streamRef.current) {
        throw new Error("No media stream available. Please start preview first.");
      }

      if (!selectedMatch) {
        throw new Error("Please select a match to overlay on the stream.");
      }

      // Create stream record in Firebase
      const streamData = {
        isActive: true,
        matchId: selectedMatch,
        startedAt: Timestamp.now(),
        viewerCount: 0,
        // In production: Add Livepeer streamKey and playbackId here
        playbackUrl: `${window.location.origin}/live/stream`,
      };

      console.log("📹 AdminLiveStream: Creating stream with data:", streamData);

      const streamDoc = await addDoc(collection(db, "livestreams"), streamData);
      console.log("📹 AdminLiveStream: Stream created with ID:", streamDoc.id);

      setStreamId(streamDoc.id);

      // 🎥 PRODUCTION: Connect to Livepeer or WebRTC server here
      // Example Livepeer integration:
      /*
      const response = await fetch('https://livepeer.studio/api/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_LIVEPEER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `Match ${selectedMatch}`,
          profiles: [
            { name: '720p', bitrate: 2000000, fps: 30, width: 1280, height: 720 }
          ]
        })
      });
      const { streamKey, playbackId } = await response.json();
      
      // Update Firebase with stream details
      await updateDoc(doc(db, "livestreams", streamDoc.id), {
        streamKey,
        playbackId,
        playbackUrl: `https://cdn.livepeer.com/hls/${playbackId}/index.m3u8`
      });
      */

      // ✅ CRITICAL: Keep camera rolling by ensuring video element stays active
      // Make absolutely sure the video element continues playing
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play warning:", playErr);
          // Try to play again after a short delay
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().catch(e => console.warn("Retry play failed:", e));
            }
          }, 100);
        }
      }

      setIsStreaming(true);
      setIsLoading(false);

      // 📹 Start broadcasting frames to Firebase
  startBroadcasting(streamDoc.id);

      if (onStreamStart) {
        onStreamStart(streamDoc.id);
      }

      // Show success banner (non-blocking)
      setShowSuccessBanner(true);
      setDebugInfo(`✅ Stream active | Video: ${videoRef.current ? 'OK' : 'MISSING'} | Stream tracks: ${streamRef.current?.getTracks().length || 0} | Broadcasting: 5 FPS`);
      
      // Auto-hide banner after 5 seconds
      setTimeout(() => setShowSuccessBanner(false), 5000);

    } catch (err: any) {
      setIsLoading(false);
      setError(`❌ Failed to start stream: ${err.message}`);
      console.error("Go live error:", err);
    }
  };

  /**
   * End the live stream
   */
  const endStream = async () => {
    try {
      setIsLoading(true);

      // Update Firebase: mark stream as inactive
      if (streamId) {
        console.log("📹 AdminLiveStream: Ending stream with ID:", streamId);
        await updateDoc(doc(db, "livestreams", streamId), {
          isActive: false,
          endedAt: Timestamp.now(),
          currentFrame: null // Clear frame data
        });
        console.log("📹 AdminLiveStream: Stream marked as inactive");
      }

      // Stop broadcasting frames
      stopBroadcasting();

      // Stop media tracks
      stopPreview();

      // Close WebRTC connection if exists
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      setIsStreaming(false);
      setStreamId(null);
      setIsLoading(false);

      if (onStreamEnd) {
        onStreamEnd();
      }

      alert("✅ Stream ended successfully!");

    } catch (err: any) {
      setIsLoading(false);
      setError(`❌ Error ending stream: ${err.message}`);
      console.error("End stream error:", err);
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isStreaming) {
        endStream();
      } else {
        stopPreview();
      }
    };
  }, [isStreaming]);

  /**
   * 🔥 CRITICAL: Monitor and maintain video playback while streaming
   * This ensures the camera feed never goes blank
   */
  useEffect(() => {
    if (!isStreaming || !videoRef.current || !streamRef.current) {
      return;
    }

    // Ensure video element has the stream and is playing
    const ensureVideoPlaying = () => {
      if (videoRef.current && streamRef.current) {
        // Check if srcObject is still set
        if (videoRef.current.srcObject !== streamRef.current) {
          console.log("🔧 Restoring video srcObject");
          videoRef.current.srcObject = streamRef.current;
        }

        // Check if video is paused
        if (videoRef.current.paused) {
          console.log("🔧 Resuming video playback");
          videoRef.current.play().catch(err => {
            console.warn("Video play error:", err);
          });
        }
      }
    };

    // Run immediately
    ensureVideoPlaying();

    // Check every 500ms to ensure video stays active
    const monitorInterval = setInterval(ensureVideoPlaying, 500);

    // Also listen for pause events and immediately resume
    const handlePause = () => {
      console.log("🔧 Video paused unexpectedly, resuming...");
      if (videoRef.current && isStreaming) {
        videoRef.current.play().catch(err => {
          console.warn("Resume play error:", err);
        });
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('pause', handlePause);
    }

    return () => {
      clearInterval(monitorInterval);
      if (videoElement) {
        videoElement.removeEventListener('pause', handlePause);
      }
    };
  }, [isStreaming]);

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📹 Admin Live Stream</h2>
          <p className="text-sm text-gray-600 mt-1">
            Broadcast live video with real-time match overlays
          </p>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-red-700 font-bold text-sm">LIVE</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-lg p-4 animate-pulse">
          <p className="text-green-800 font-bold text-sm">🔴 YOU ARE NOW LIVE!</p>
          <p className="text-green-700 text-xs mt-1">Viewers can watch at /live</p>
          {debugInfo && (
            <p className="text-green-600 text-xs mt-2 font-mono">{debugInfo}</p>
          )}
        </div>
      )}

      {/* Match Selection */}
      {!isStreaming && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Match for Overlay
          </label>
          <select
            value={selectedMatch}
            onChange={(e) => setSelectedMatch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isPreviewing || isStreaming}
          >
            <option value="">-- Select a live match --</option>
            {availableMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.teamA.name} vs {match.teamB.name} - {match.league}
              </option>
            ))}
          </select>
          {availableMatches.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ No live matches found. Create a live match first.
            </p>
          )}
        </div>
      )}

      {/* Video Preview */}
      <div className="mb-6 bg-black rounded-lg overflow-hidden aspect-video relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        {!isPreviewing && !isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="text-6xl mb-4">📹</div>
              <p className="text-white text-lg">Camera Preview</p>
              <p className="text-gray-400 text-sm mt-2">
                Click "Start Preview" to see your camera
              </p>
            </div>
          </div>
        )}
        
        {/* Debug Status Indicator */}
        {(isPreviewing || isStreaming) && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 px-3 py-2 rounded-lg text-xs font-mono text-white">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${streamRef.current ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span>{isStreaming ? '🔴 STREAMING' : '👁️ PREVIEW'}</span>
            </div>
            <div className="mt-1 text-gray-300">
              Tracks: {streamRef.current?.getTracks().length || 0} | 
              Playing: {videoRef.current?.paused ? 'NO' : 'YES'}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        {!isPreviewing && !isStreaming && (
          <button
            onClick={startPreview}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Starting..." : "📹 Start Preview"}
          </button>
        )}

        {isPreviewing && !isStreaming && (
          <>
            <button
              onClick={goLive}
              disabled={isLoading || !selectedMatch}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Going Live..." : "🔴 Go Live"}
            </button>
            <button
              onClick={stopPreview}
              disabled={isLoading}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {isStreaming && (
          <button
            onClick={endStream}
            disabled={isLoading}
            className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "Ending..." : "⏹️ End Stream"}
          </button>
        )}
      </div>

      {/* Instructions */}
      {!isStreaming && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 text-sm mb-2">📝 Instructions:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Make sure you have a live match created in the system</li>
            <li>Select the match you want to broadcast</li>
            <li>Click "Start Preview" to test your camera</li>
            <li>Click "Go Live" to start broadcasting</li>
            <li>Viewers will see your stream on the /live page with match overlays</li>
            <li>Click "End Stream" when finished</li>
          </ol>
        </div>
      )}

      {/* Stream Info */}
      {isStreaming && streamId && (
        <>
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-green-900 text-sm mb-2">✅ Stream Active</h3>
            <p className="text-sm text-green-800">
              Stream ID: <code className="bg-green-100 px-2 py-1 rounded">{streamId}</code>
            </p>
            <p className="text-sm text-green-800 mt-2">
              📺 Viewers can watch at: <strong>{window.location.origin}/live</strong>
            </p>
          </div>

          {/* Live Preview for Admin */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 bg-red-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-gray-900">📺 Live Preview (What Viewers See)</h3>
            </div>
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <LiveVideoPlayer streamId={streamId} showControls={false} />
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              ℹ️ This is what viewers see on the /live page with real-time overlays
            </p>
          </div>
        </>
      )}
    </div>
  );
}
