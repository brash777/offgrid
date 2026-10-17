# FlowStore · reglas del proyecto

Tienda de ropa de escritorio con avatar 3D (foto → avatar) e IA, más su backend. Proyecto universitario, desarrollado por una sola persona. Sustentación: lunes 19-oct-2026 (por confirmar). Prioridad: que funcione y se vea impresionante en la demo; el estudiante debe poder explicar cada decisión. El alcance vive en `docs/00-alcance.md`.

## Cómo trabajar
- Español informal (Colombia), claro. Si se usa un tecnicismo, explicarlo en una línea.
- Se trabaja por fases (ver alcance). Al final de cada fase: cómo probarla (curl o Swagger), mostrar que funciona y esperar el OK.
- Si algo es ambiguo, preguntar antes. Si algo falla, primero la causa probable y luego la solución.
- Al terminar cada tarea: 2 frases con lo que quedó y el siguiente paso.

## Git
- Repo: `backend/`, `desktop/`, `docs/`, README.md en la raíz y uno por parte.
- Commits en español, descriptivos, uno por cambio lógico. Una rama por funcionalidad, push normal.
- NO abrir Pull Requests salvo que se pidan. Nunca borrar ni reescribir historial sin preguntar. Sin migraciones ni refactors grandes en la rama principal sin avisar.

## Estilo de código
- Código 100% en inglés (identificadores, nombres de archivo, migraciones, logs, Swagger, nombres de pruebas) y sin comentarios.
- Los textos que ve el usuario van en español en `backend/src/main/resources/messages.properties`; el código solo usa claves (`error.CODE`, `validation.*`, `message.*`).
- El porqué de cada decisión se documenta en `docs/`, no en comentarios.
- Datos de negocio (nombres de productos y categorías de la semilla) en español: son contenido, no código.

## Stack backend (no cambiar sin preguntar)
Java (destino 21), Spring Boot 3.5, Spring Security 6 + JWT (jjwt), Spring Data JPA (`ddl-auto=validate`), Flyway, springdoc-openapi, Maven wrapper, PostgreSQL en Supabase por el Session pooler (la conexión directa es solo IPv6 y falla). Sin Lombok, inyección por constructor, DTOs como records, un paquete por concepto de dominio.
- IA: cliente HTTP compatible con OpenAI y proveedor gratuito configurable por env (reemplaza al SDK de Anthropic; pendiente de aprobación).
- Escritorio (`desktop/`): Electron + React + Vite + TypeScript, animaciones con `motion`, CSS Modules + `src/styles/tokens.css`. Textos visibles en `src/i18n/es.ts`. Sistema de diseño en `desktop/DESIGN.md`; revisar `styleguide.html` antes de construir pantallas.
- Referencias visuales en `docs/referencias/`: solo se toma el estilo, nunca textos, logos ni fotos.

## Reglas técnicas no negociables
- Una sola fuente de verdad: stock = SUM(stock_movements); el total del pedido se calcula desde sus líneas. Sin totales duplicados.
- Dinero en COP: NUMERIC(14,2) / BigDecimal, nunca float. La línea de pedido guarda el precio del momento (snapshot).
- Fechas TIMESTAMPTZ, zona America/Bogota, rangos semiabiertos.
- El userId SIEMPRE sale del JWT. Recurso de otro usuario → 404, no 403.
- BCrypt costo 10. Refresh y reset tokens guardados como SHA-256. Access token 15 min (solo en memoria), refresh 30 días (revocable). Endpoints de administración solo para ADMIN.
- Secretos solo por variables de entorno en `.env` (en .gitignore). Mantener `.env.example` sin valores reales. Nunca un secreto en un commit.
- Flyway V1, V2… Nunca editar una migración ya aplicada: crear la siguiente. Datos de prueba solo en la carpeta dev (V900) con perfil dev.
- Subida de archivos: validar tipo, tamaño y extensión; nombres generados por el servidor; nunca ejecutar ni servir contenido sin validar.
- Todo texto externo se muestra como texto, nunca como HTML.
- Bean Validation en cada DTO de entrada. Errores con formato único y mensajes en español (vía `messages.properties`). CORS configurable por env.
- IA: la clave de API solo en el servidor; interruptor `AI_ENABLED`; límite de uso por usuario; si falla, mensaje claro y nada se cae. Solo recomienda productos reales (consulta la BD con herramientas), nunca inventa productos ni precios.
- La foto del usuario es dato sensible: solo para generar el avatar, borrable, y se le avisa.
- Tests: registro/login, permisos, cálculo de pedido y stock, y que un usuario no vea datos de otro.

## Diseño (cuando toque)
DESIGN.md + tokens.css (sin colores a mano), `styleguide.html` revisada por el estudiante antes de las pantallas, contraste mínimo 4.5:1, no depender solo del color, tipografías libres guardadas en el proyecto, movimiento solo con transform/opacity y respetando prefers-reduced-motion, pensado para escritorio (ventana redimensionable, atajos de teclado, foco visible). De las referencias solo se toma el estilo, no textos, logos ni marcas.
