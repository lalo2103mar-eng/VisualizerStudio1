# Visualizer Studio

Versión inicial 0.1.0. Proyecto Android-first con Vite, TypeScript y Capacitor.

## Qué incluye esta primera base
- Interfaz adaptable a móvil.
- Carga local de audio.
- Reproductor con Web Audio API y análisis de frecuencias.
- Tres visualizadores iniciales: circular, ondas y partículas.
- Ajustes básicos de sensibilidad, color y brillo.

## Qué todavía no está implementado
- APK compilada.
- Exportación MP4 1080p.
- Editor avanzado por capas.
- Biblioteca persistente de presets.
- Todos los estilos visuales previstos.

## Requisitos para desarrollo
Node.js 20 o superior y npm.

## Ejecutar en un ordenador o entorno compatible
```bash
npm install
npm run dev
```

## Preparar Android (cuando esté configurado el entorno)
```bash
npm run build
npx cap add android
npx cap sync android
```

Después se debe compilar la carpeta `android` con Gradle/Android SDK. La APK final requiere pruebas en un dispositivo Android real.

## Nota sobre audio
La reproducción de MP3 y M4A depende de los códecs disponibles en el navegador/WebView y del contenido del archivo. La etapa nativa deberá validar y manejar los formatos admitidos por Android.
