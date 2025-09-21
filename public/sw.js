// Empty service worker to prevent 404 errors
// This file prevents browser from requesting non-existent service worker

self.addEventListener('install', () => {
  // Skip waiting and activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Clean up and take control immediately
  self.clients.claim();
});

// No caching or other SW functionality implemented
