# Despliegue en Vercel

El despliegue actual usa Docker, Nginx y PostgreSQL local en AWS. Vercel solo
es viable si se conecta a una instancia PostgreSQL privada o administrada que
sea accesible de forma segura desde sus funciones.

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

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `ANALIA_OPENAI_MODEL`

`DATABASE_URL` es server-only. Las cuentas y sesiones deben aprovisionarse en
la misma base mediante las migraciones de `app_auth`.

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
