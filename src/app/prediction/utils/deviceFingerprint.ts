/**
 * Device Fingerprinting Utility
 * Generates a unique identifier based on device characteristics
 */

export function generateDeviceFingerprint(): string {
  // Collect device characteristics
  const characteristics = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.maxTouchPoints || 0,
  ];

  // Create a simple hash from characteristics
  const fingerprint = characteristics.join('|');
  return hashString(fingerprint);
}

/**
 * Simple hash function to create a consistent ID from a string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get or create a persistent device ID
 * Stores in localStorage and generates new one if not found
 */
export function getDeviceId(): string {
  const storageKey = 'ppsu_device_id';
  
  // Try to get existing device ID from localStorage
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    // Generate new device ID combining fingerprint with random component
    const fingerprint = generateDeviceFingerprint();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    
    deviceId = `${fingerprint}-${timestamp}-${random}`;
    
    // Store it for future use
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
}

/**
 * Check if device is registered for a specific match
 */
export function isDeviceRegistered(matchId: string): boolean {
  const key = `device_registered_${matchId}`;
  return localStorage.getItem(key) === 'true';
}

/**
 * Mark device as registered for a specific match
 */
export function markDeviceRegistered(matchId: string): void {
  const key = `device_registered_${matchId}`;
  localStorage.setItem(key, 'true');
}

/**
 * Clear device registration (for testing purposes)
 */
export function clearDeviceRegistration(matchId?: string): void {
  if (matchId) {
    localStorage.removeItem(`device_registered_${matchId}`);
  } else {
    // Clear all registration data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('device_registered_') || key.startsWith('prediction_')) {
        localStorage.removeItem(key);
      }
    });
  }
}
