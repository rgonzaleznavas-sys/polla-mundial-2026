// Service worker mínimo — solo necesario para que el navegador permita "Instalar app"
// No cachea nada agresivamente para evitar mostrar datos viejos de la polla.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Pass-through: siempre va a la red, nunca sirve caché viejo
  event.respondWith(fetch(event.request))
})
