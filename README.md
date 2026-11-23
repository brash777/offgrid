# OFFGRID (FlowStore)

Tienda de streetwear de escritorio para Mac, con **probador en vivo** (la cámara funciona como espejo y la prenda te aparece puesta) y un **estilista con IA** que arma looks solo con productos reales del catálogo. Proyecto universitario de una sola persona.

| Carpeta | Qué hay |
|---|---|
| `backend/` | API REST en Java con Spring Boot: cuentas, catálogo, stock, carrito, pedidos, pago simulado y estilista con IA. Ver `backend/README.md`. |
| `desktop/` | App de escritorio con Electron, React y TypeScript: tienda, probador en vivo con MediaPipe y estilista. Ver `desktop/README.md`. |
| `docs/` | Alcance (`00`), decisiones técnicas (`01`), referencias de diseño (`02`) y guion de la sustentación (`03`). |
| `scripts/` | Arranque y apagado de la demo. |

## Arrancar la demo

Doble clic en `scripts/start-demo.command` (o córrelo en la terminal). El script:
1. Enciende PostgreSQL si está apagado.
2. Arranca el backend con el perfil `dev` contra la base local `flowstore` y espera a que responda.
3. Abre la app empaquetada `desktop/release/mac-arm64/OFFGRID.app`.

Para apagar: `scripts/stop-demo.command` apaga el backend y con `--all` también PostgreSQL. Los registros quedan en `~/Library/Logs/OFFGRID/`.

## Requisitos (primera vez)

- macOS con Apple Silicon, PostgreSQL 18 (`brew install postgresql@18`), JDK 21 o superior y Node 24.
- Base de datos: `createdb flowstore`. Las tablas y los datos de prueba los crea Flyway al arrancar el backend.
- Secretos: copiar `backend/.env.example` a `backend/.env` y llenar `JWT_SECRET` y, para la IA, `AI_API_KEY`. El `.env` nunca se sube a git.
- App: `cd desktop && npm install && npm run package:dir`.

Las cuentas de prueba están en `desktop/README.md`.
