const CACHE_NAME='fischer-cache-v1';
const FILES=['./','./index.html','./style.css','./script.js','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>r).catch(()=>caches.match(e.request).then(c=>c|| (e.request.mode==='navigate'?caches.match('./index.html'):undefined))));
});
