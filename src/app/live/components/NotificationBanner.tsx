// src/app/live/components/NotificationBanner.tsx
"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/app/live/hooks/useNotifications";
import { useLiveActivity } from "@/app/live/hooks/useLiveActivity";

export default function NotificationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { permission, isSupported, requestPermission } = useNotifications();
  const { isIOS, isSupported: isLiveActivitySupported } = useLiveActivity();

  useEffect(() => {
    // Check if user has already made a decision
    const dismissed = localStorage.getItem("notificationBannerDismissed");
    const granted = localStorage.getItem("liveScoresNotifications");
    
    if (dismissed === "true" || granted === "granted" || permission === "granted") {
      setIsDismissed(true);
      return;
    }

    // Show banner after 2 seconds
    const timer = setTimeout(() => {
      if (isSupported && permission === "default") {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isSupported, permission]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setIsVisible(false);
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("notificationBannerDismissed", "true");
  };

  if (!isVisible || isDismissed) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in" />
      
      {/* Banner */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-2 border-blue-500">
          {/* Header with Icon */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white text-center">
            <div className="text-6xl mb-3">🔔</div>
            <h3 className="text-2xl font-bold mb-2">
              {isIOS ? "Enable Live Activities" : "Enable Notifications"}
            </h3>
            <p className="text-blue-100 text-sm">
              Get real-time updates on your favorite matches
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <h4 className="font-semibold text-gray-800">Instant Score Updates</h4>
                  <p className="text-sm text-gray-600">
                    Get notified immediately when goals are scored
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">⏱️</div>
                <div>
                  <h4 className="font-semibold text-gray-800">Live Match Timer</h4>
                  <p className="text-sm text-gray-600">
                    See real-time countdown in your notifications
                  </p>
                </div>
              </div>

              {isIOS && isLiveActivitySupported && (
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📱</div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Dynamic Island Support</h4>
                    <p className="text-sm text-gray-600">
                      Live scores right in your Dynamic Island (iPhone 14 Pro+)
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="text-2xl">🏆</div>
                <div>
                  <h4 className="font-semibold text-gray-800">Match Highlights</h4>
                  <p className="text-sm text-gray-600">
                    Get alerts for game start, halftime, and final score
                  </p>
                </div>
              </div>
            </div>

            {/* iOS Specific Instructions */}
            {isIOS && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tip for iPhone users:</strong> Add this page to your Home Screen 
                  for the best experience with Live Activities!
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Not Now
              </button>
              <button
                onClick={handleEnable}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition shadow-lg"
              >
                Enable
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              You can change this anytime in your browser settings
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
