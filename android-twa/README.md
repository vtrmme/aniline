# AniLine Android (TWA) — APK gratis

Este directorio contiene la configuración para generar un APK/AAB de AniLine usando una **Trusted Web Activity (TWA)** (gratis, reutilizable para Google Play más adelante). La web sigue funcionando igual; el APK abre `https://aniline.vercel.app` como app instalada.

## Requisitos previos (en la web, ya preparados en este repo)
- PWA instalable: `app/manifest.ts`, iconos en `public/`, `public/sw.js`.
- Verificación de dominio: `public/.well-known/assetlinks.json` (debes poner la huella SHA-256 real de tu clave de firma).
- Despliegue en producción con el dominio canónico actualizado.

Si tu dominio no es `https://aniline.vercel.app`, edita `twa-manifest.json` (host, iconUrl, maskableIconUrl, webManifestUrl, fullScopeUrl, startUrl) antes de generar.

## Opción A (más fácil, gratis, sin instalar Android Studio): PWABuilder
1. Despliega los cambios de este repo en Vercel.
2. Ve a https://www.pwabuilder.com e ingresa `https://aniline.vercel.app`.
3. Genera el paquete **Android** (opción APK/TWA). Descarga el proyecto/artefacto.
4. Para firma: PWABuilder puede gestionar firma o puedes firmar con tu keystore. Guarda la keystore y su huella SHA-256.
5. Actualiza `public/.well-known/assetlinks.json` con `package_name` (`com.aniline.app`) y la huella SHA-256 real, despliega y vuelve a generar si es necesario para que la verificación pase.
6. Publica el APK (ver “Publicar el APK” abajo).

## Opción B: Bubblewrap CLI (local o CI)
### 1) Generar keystore (una sola vez, guárdala)
```bash
keytool -genkey -v -keystore android.keystore -alias aniline -keyalg RSA -keysize 2048 -validity 10000
```
Coloca `android.keystore` en `android-twa/` (no se commitea, ver `.gitignore`).

### 2) Obtener huella SHA-256 y actualizar assetlinks
```bash
keytool -list -v -keystore android.keystore -alias aniline
```
Copia la huella **SHA256** y reemplaza `REPLACE_WITH_YOUR_RELEASE_KEY_SHA256_FINGERPRINT` en `public/.well-known/assetlinks.json`. Haz commit y despliega en Vercel.

### 3) Generar el proyecto y compilar
```bash
npm install -g @bubblewrap/cli
cd android-twa
bubblewrap update   # o: bubblewrap init --manifest=https://aniline.vercel.app/manifest.webmanifest
bubblewrap build
```
Requiere JDK y Android SDK instalados y aceptadas las licencias (`sdkmanager --licenses`). El APK/AAB quedará en la carpeta de salida que indique Bubblewrap.

## Publicar el APK para el botón “Descargar app”
- Crea un **GitHub Release** en `vtrmme/aniline` y sube el `.apk` como asset, o súbelo a un storage público con URL directa estable.
- En Vercel, define la variable de entorno `NEXT_PUBLIC_APK_DOWNLOAD_URL` con la URL directa al `.apk` y redespliega. El botón aparecerá en la web (navbar y home).
- **Instalación (sideload):** en Android, el usuario debe permitir “instalar apps de orígenes desconocidos” para el navegador/gestor de archivos usado.

## Notas
- **OAuth/NextAuth:** si el login no completa dentro de la TWA, revisa los redirect URIs/callbacks en Google Cloud y `NEXTAUTH_URL` para el dominio de producción.
- **Actualizaciones:** al cambiar la web, la TWA refleja el contenido del sitio; para cambios del paquete nativo (icono, versión, permisos) genera un nuevo APK con `appVersionCode` incrementado.
- **Google Play (más tarde):** reutiliza el mismo proyecto/keystore para generar el `.aab` (`bubblewrap build` produce bundle) y súbelo a Play Console. Mantén la misma huella en `assetlinks.json`.
- No commitees `android.keystore`, `*.jks`, ni APKs/AABs al repo.