# AniLine Android (TWA) - APK

Este directorio contiene la configuración para generar un APK/AAB de AniLine usando una **Trusted Web Activity (TWA)**. La web sigue funcionando igual; el APK abre la versión desplegada como app instalada.

## Requisitos previos (web)
- PWA instalable: `app/manifest.ts`, iconos en `public/`, `public/sw.js`.
- Verificación de dominio: `public/.well-known/assetlinks.json` con la huella SHA-256 real de tu clave de firma.
- Sitio desplegado en producción (por defecto `https://aniline.vercel.app`).

Si tu dominio cambia, edita `twa-manifest.json` (`host`, `iconUrl`, `maskableIconUrl`, `webManifestUrl`, `fullScopeUrl`, `startUrl`) antes de generar.

## Opción A: PWABuilder (sin Android Studio)
1. Despliega los cambios en producción.
2. Ve a https://www.pwabuilder.com e ingresa la URL del sitio.
3. Genera el paquete **Android** (APK/TWA) y descárgalo.
4. Firma con tu keystore (o la opción que ofrezca PWABuilder) y guarda la huella SHA-256.
5. Actualiza `public/.well-known/assetlinks.json` con `package_name` (`com.aniline.app`) y la huella SHA-256 real, despliega y regenera si es necesario.

## Opción B: Bubblewrap CLI
### 1) Generar keystore (una sola vez, guárdala segura)
```bash
keytool -genkey -v -keystore android.keystore -alias aniline -keyalg RSA -keysize 2048 -validity 10000
```
Coloca `android.keystore` en `android-twa/` (no se commitea).

### 2) Obtener huella SHA-256 y actualizar assetlinks
```bash
keytool -list -v -keystore android.keystore -alias aniline
```
Copia la huella **SHA256** y reemplaza el valor en `public/.well-known/assetlinks.json`. Haz deploy.

### 3) Generar y compilar
```bash
npm install -g @bubblewrap/cli
cd android-twa
bubblewrap update   # o: bubblewrap init --manifest=https://aniline.vercel.app/manifest.webmanifest
bubblewrap build
```
Requiere JDK y Android SDK instalados y licencias aceptadas (`sdkmanager --licenses`).

## Publicar el APK (botón "Descargar app")
- Sube el `.apk` a un **GitHub Release** o storage con URL directa estable.
- Define `NEXT_PUBLIC_APK_DOWNLOAD_URL` con esa URL y redespliega. Si está vacío, el botón se oculta.
- Instalación: el usuario debe permitir "instalar apps de orígenes desconocidos" en Android.

## Notas
- **OAuth/NextAuth en TWA:** si el login no completa dentro de la app, revisa redirect URIs/callbacks en Google Cloud y `NEXTAUTH_URL`/`NEXT_PUBLIC_SITE_URL` en producción.
- **Actualizaciones:** cambios web se reflejan en la TWA; cambios nativos (icono, versión, permisos) requieren nuevo build con `appVersionCode` incrementado en `twa-manifest.json`.
- **Google Play:** reutiliza el mismo proyecto/keystore para generar `.aab` y mantén la misma huella en `assetlinks.json`.
- No commitees `android.keystore`, `*.jks`, ni APKs/AABs.
