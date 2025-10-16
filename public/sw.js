// public/sw.js
// Service Worker for Push Notifications and Background Sync

const CACHE_NAME = "ppsu-live-scores-v1";
const urlsToCache = [
  "/",
  "/live",
  "/ppsu.png",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Push notification event
self.addEventListener("push", (event) => {
  console.log("Push notification received", event);

  let data = {
    title: "Live Score Update",
    body: "A match has been updated",
    icon: "/ppsu.png",
    badge: "/ppsu.png",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error("Error parsing push data", e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: "view",
        title: "View Match",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked", event);

  event.notification.close();

  if (event.action === "view") {
    // Open the live scores page
    event.waitUntil(
      clients.openWindow("/live")
    );
  } else if (event.action === "close") {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow("/live")
    );
  }
});

// Background sync for offline updates
self.addEventListener("sync", (event) => {
  console.log("Background sync", event);

  if (event.tag === "sync-scores") {
    event.waitUntil(syncScores());
  }
});

async function syncScores() {
  try {
    // Fetch latest scores when back online
    const response = await fetch("/api/live-scores");
    const data = await response.json();
    
    // Notify all clients about the update
    const allClients = await clients.matchAll({
      includeUncontrolled: true,
    });

    allClients.forEach((client) => {
      client.postMessage({
        type: "SCORES_UPDATED",
        data: data,
      });
    });

    console.log("Scores synced successfully");
  } catch (error) {
    console.error("Error syncing scores", error);
  }
}

// Message event - handle messages from clients
self.addEventListener("message", (event) => {
  console.log("Message received in service worker", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "REGISTER_LIVE_ACTIVITY") {
    // Handle Live Activity registration for iOS
    console.log("Live Activity registered", event.data.game);
  }
});
