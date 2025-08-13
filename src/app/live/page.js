'use client';
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function LivePage() {
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  // Fetch the active live stream from Firestore
  useEffect(() => {
    const q = query(collection(db, 'live_streams'), where('status', '==', 'live'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setStream(snapshot.docs[0].data());
      } else {
        setStream(null);
      }
    });
    return () => unsub();
  }, []);

  // Initialize HLS player when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(`http://localhost:8000/live/${stream.streamKey}/index.m3u8`);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = `http://localhost:8000/live/${stream.streamKey}/index.m3u8`;
      }
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="flex h-screen items-center justify-center text-2xl text-gray-700">
        No live stream right now 📺
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black">
      {/* Video Player */}
      <video
        ref={videoRef}
        controls
        autoPlay
        className="w-full h-full object-cover"
      />

      {/* Overlays */}
      {stream.overlays?.map((overlay, idx) => (
        <div
          key={idx}
          className={`absolute ${overlay.position} p-2 text-white`}
          style={{
            fontSize:
              overlay.size === 'large'
                ? '2rem'
                : overlay.size === 'medium'
                  ? '1.5rem'
                  : '1rem',
          }}
        >
          {overlay.type === 'text'
            ? overlay.content
            : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={overlay.content} alt="overlay" />
            )}
        </div>
      ))}
    </div>
  );
}

