# Configuración: Actualización automática de resultados

Esta función consulta API-Football cada 30 minutos y actualiza los resultados
del Mundial automáticamente en Supabase. Gracias a Realtime, la Tabla se
actualiza sola para todos sin que nadie recargue la página.

## Variables de entorno necesarias (agregar en Vercel)

Ve a Vercel → tu proyecto → Settings → Environment Variables y agrega:

| Variable | De dónde sacarla |
|---|---|
| `API_FOOTBALL_KEY` | Tu API key de api-football.com (dashboard → Requests) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API Keys → "Legacy anon, service_role" → service_role (NO la anon, esta es la secreta) |
| `CRON_SECRET` | Inventa una clave larga y aleatoria, ej: `polla2026_cron_x7k9m2` |

Las variables `VITE_SUPABASE_URL` ya las tienes configuradas — esta función las reutiliza.

⚠️ **IMPORTANTE:** `SUPABASE_SERVICE_ROLE_KEY` es una clave con permisos totales
sobre tu base de datos. NUNCA la pongas con el prefijo `VITE_` (eso la expondría
al navegador). Va sin prefijo, solo se usa del lado del servidor.

## Cómo funciona

1. Vercel Cron llama a `/api/sync-results` cada 30 minutos automáticamente
2. La función pregunta a API-Football: "¿qué pasó en el Mundial 2026?"
3. Por cada partido con marcador disponible, lo guarda en la tabla `results`
4. Supabase Realtime notifica a todos los navegadores conectados → la Tabla se actualiza sola

## Probar manualmente

Puedes forzar una sincronización visitando (reemplaza con tu dominio y secret):

```
https://tu-app.vercel.app/api/sync-results
```

con el header `Authorization: Bearer TU_CRON_SECRET` (puedes probarlo con Postman,
o quitar temporalmente la validación del CRON_SECRET para probar desde el navegador).

## Límites del plan gratis de API-Football

100 requests/día. Con un cron cada 30 min son 48 requests/día — dentro del límite.
Si quieres actualizaciones más frecuentes en días de partido, considera el plan pago
de API-Football, o ajusta el cron a cada 15 min (96 requests/día, sigue dentro del límite).
