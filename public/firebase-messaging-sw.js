// Firebase Cloud Messaging Service Worker
// This file should be in the public folder

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAYFXsaJa2GHN5PLSXxBAvlsLRSCdyQRsg",
    authDomain: "the-ppsu-chronciles.firebaseapp.com",
    projectId: "the-ppsu-chronciles",
    storageBucket: "the-ppsu-chronciles.firebasestorage.app",
    messagingSenderId: "366446192944",
    appId: "1:366446192944:web:527058441fdd311b6d00f5",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'AFCON 2025 Update';
    const notificationOptions = {
        body: payload.notification?.body || 'New update available',
        icon: '/afcon-logo.png',
        badge: '/afcon-badge.png',
        tag: payload.data?.fixtureId || 'afcon-notification',
        data: payload.data,
        vibrate: [200, 100, 200],
        actions: [
            { action: 'open', title: 'View Match' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const fixtureId = event.notification.data?.fixtureId;
    const url = fixtureId
        ? `/afcon25/fixtures/${fixtureId}`
        : '/afcon25/fixtures';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes('/afcon25') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
