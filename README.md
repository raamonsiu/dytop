# DYTOP

Reproductor ambient de YouTube con letras sincronizadas. Dos vistas sobre un
único motor de reproducción:

- **minimal** (`/`, `/history`) — fondo dither, tipografía monoespaciada, letras
  con juego de opacidad. Sigue la línea del portfolio de
  [D1ITO](https://d1ito.dev).
- **legacy** (`/legacy`) — la vista del prototipo: fondos propios, color de
  acento extraído de la imagen, anillo de progreso alrededor de la ventana.

No hay backend. Todo son APIs públicas sin clave: la IFrame API de YouTube para
el audio, oEmbed para los metadatos y [lrclib](https://lrclib.net) para las
letras.

## Desarrollo

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Docker

```bash
docker compose up --build     # http://localhost:8080
```

Imagen multi-stage: build con pnpm, servido por nginx. Sin Node en tiempo de
ejecución.

## Estructura

```
src/
  themes/       tokens de diseño compartidos por ambas vistas
  player/       motor de YouTube, reloj rAF, cola, controlador
  lyrics/       parser LRC, cliente lrclib, estado
  backgrounds/  IndexedDB, muestreo de accent, rotación
  views/        minimal/ y legacy/
  lib/          utilidades puras y hooks
docs/
  prototype.html   el prototipo original, intacto
  PARITY.md        qué se mantuvo, qué mejoró y qué se desvió a propósito
```

### Decisiones que conviene conocer antes de tocar nada

- **El iframe no se puede mover.** Vive en `PlayerHost`, montado por
  `RootLayout` fuera del `<Outlet/>`. Reparentarlo en el DOM lo recarga y corta
  la reproducción. Además `YT.Player` *reemplaza* el elemento que recibe, por
  eso se le pasa un nodo creado a mano que React no gestiona.
- **El tiempo no pasa por React.** `player/clock.ts` extrapola entre sondeos de
  300 ms y entrega valores por frame a suscriptores que escriben directamente en
  el DOM. Meterlo en estado re-renderizaría el árbol 60 veces por segundo.
- **El accent es por subárbol.** `globals.css` deriva `--accent` de
  `--accent-override` sobre `[data-view]`. El accent dinámico de legacy se
  escribe en su propio shell; sobre `:root` se filtraría a la vista minimal al
  navegar sin recargar.
- **`three` solo lo carga minimal.** El componente Dither va en un chunk aparte
  vía `React.lazy`; pesa más que todo el resto de la app junta.
