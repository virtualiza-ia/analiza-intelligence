# Despliegue en Vercel

Vercel es la ruta mas rapida para mostrar Analiza Intelligence con una URL publica sin depender de un servidor propio.

## Opcion recomendada: GitHub privado + Vercel

1. Crear un repositorio privado en GitHub.
2. Subir el proyecto.
3. En Vercel, elegir `Add New...` y luego `Project`.
4. Importar el repositorio.
5. Vercel detectara Next.js automaticamente.
6. Agregar las variables de entorno.
7. Deploy.

## Variables de entorno

Configurar estas variables en Vercel Project Settings > Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `ANALIA_OPENAI_MODEL`
- `ANALIZA_DISABLE_DEMO_ADMIN`
- `ANALIZA_ENABLE_DEMO_ADMIN`
- `ANALIZA_DEMO_ADMIN_EMAIL`
- `ANALIZA_DEMO_ADMIN_PASSWORD`
- `ANALIZA_DEMO_ADMIN_SESSION_TOKEN`

Para pruebas internas sin datos reales, usar:

- `ANALIZA_ENABLE_DEMO_ADMIN=true`
- `ANALIZA_DISABLE_DEMO_ADMIN=false`
- `ANALIZA_DEMO_ADMIN_EMAIL=admin.demo@analiza.local`
- `ANALIZA_DEMO_ADMIN_PASSWORD`: una contrasena privada para la demo
- `ANALIZA_DEMO_ADMIN_SESSION_TOKEN`: una cadena privada larga para firmar la sesion demo

Para produccion real con datos reales:

- `ANALIZA_ENABLE_DEMO_ADMIN=false`
- `ANALIZA_DISABLE_DEMO_ADMIN=true`

## Configuracion de build

Vercel debe usar:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: dejar automatico
- Install Command: `npm install`

## Como se actualiza

Cada vez que se suba un cambio al repositorio:

- Si es una rama de prueba, Vercel crea un Preview Deploy con URL unica.
- Si es la rama principal, Vercel actualiza produccion.

## Opcion rapida sin GitHub

Tambien se puede desplegar desde la computadora con Vercel CLI:

```bash
npx vercel login
npx vercel
```

Para produccion:

```bash
npx vercel --prod
```

Esta opcion sirve para salir rapido, pero GitHub privado es mejor para seguir trabajando ordenadamente.
