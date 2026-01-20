self.addEventListener('install', () => {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', () => {
  // No cacheamos nada todavía
});
