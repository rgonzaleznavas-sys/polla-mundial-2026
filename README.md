# ⚽ Polla Mundial 2026

App de pronósticos para la fase de grupos del Mundial 2026.  
Stack: React + Vite · Supabase · Vercel

## Características

- Registro libre por nombre
- 72 partidos de fase de grupos
- Pronósticos bloqueados al inicio de cada partido
- Panel admin con contraseña para ingresar resultados
- Tabla de líderes en tiempo real
- Puntuación: resultado exacto = 3pts · empate exacto = 5pts · ganador = 1pt

---

## Setup paso a paso

### 1. Crear proyecto Supabase

1. Ve a [supabase.com](https://supabase.com) → New project
2. Ponle nombre: `polla-mundial-2026`
3. Elige una región cerca de Panamá (us-east-1 o similar)
4. Una vez creado, ve a **SQL Editor** y pega el contenido de `supabase_schema.sql` → Run

### 2. Obtener credenciales Supabase

En tu proyecto Supabase → **Settings → API**:
- `Project URL` → es tu `VITE_SUPABASE_URL`
- `anon public` key → es tu `VITE_SUPABASE_ANON_KEY`

### 3. Crear repo en GitHub

```bash
cd polla-mundial-2026
git init
git add .
git commit -m "Initial commit"
gh repo create polla-mundial-2026 --public --push
# o manualmente en github.com
```

### 4. Deploy en Vercel

1. Ve a [vercel.com](https://vercel.com) → New Project
2. Importa el repo `polla-mundial-2026`
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
   - `VITE_ADMIN_PASSWORD` = la clave que quieras (ej: `mundial2026admin`)
4. Deploy

### 5. Compartir

Una vez deployado, comparte el link de Vercel por WhatsApp.  
Cada persona entra, pone su nombre y llena sus pronósticos.

---

## Uso

### Para participantes
1. Entrar al link
2. Ir a **Pronósticos** → escribir su nombre
3. Llenar los marcadores antes de que empiece cada partido
4. Ver la **Tabla** para el ranking

### Para el admin (tú)
1. En la app, hacer clic en el pequeño botón **Admin** (esquina superior derecha de las tabs)
2. Ingresar la contraseña configurada en `VITE_ADMIN_PASSWORD`
3. Se habilita la pestaña **Admin** donde puedes ingresar resultados reales
4. Los puntos se calculan automáticamente para todos

---

## Desarrollo local

```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales

npm install
npm run dev
```
