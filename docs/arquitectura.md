# Arquitectura de OFFGRID

Cómo están armadas las partes y por qué. El porqué detallado de cada decisión,
con fechas, está en [01-decisiones.md](01-decisiones.md).

## Vista general

```
┌──────────────────────────── Mac ────────────────────────────┐
│                                                              │
│  App de escritorio (Electron + React)                        │
│  ├─ Tienda: catálogo, carrito, pago, cuenta                  │
│  └─ Probador en vivo ─ cámara → MediaPipe (WASM + GPU)       │
│                      └ WebGL2: malla, luz, sombras, fondo    │
│            │ HTTP + JSON (JWT)                               │
│            ▼                                                 │
│  Backend (Spring Boot, puerto 8080) ───────► PostgreSQL      │
│            │                                                 │
└────────────┼─────────────────────────────────────────────────┘
             ▼ HTTPS, solo desde el servidor
       Google Gemini (estilista)
```

- La app nunca habla con la base de datos ni con Gemini: todo pasa por la API.
- La imagen de la cámara se procesa dentro de la app y no viaja a ningún lado.
- La clave de la IA vive solo en el `.env` del backend.

## Backend

Un paquete por concepto de negocio (`auth`, `user`, `catalog`, `stock`, `cart`,
`order`, `payment`, `stylist`) más `config` y `shared`. Cada paquete tiene su
controlador, servicio, repositorios y DTOs (`record` con Bean Validation).

### Modelo de datos

| Tabla | Qué guarda |
|---|---|
| `users`, `user_profiles` | Cuenta, rol (`CUSTOMER` o `ADMIN`) y medidas |
| `refresh_tokens`, `password_reset_tokens` | Hash SHA-256 de los tokens, con vencimiento y revocación |
| `categories`, `products`, `product_variants`, `product_images` | Catálogo: cada variante es un color y una talla |
| `stock_movements` | Entradas y salidas de inventario (`RESTOCK`, `SALE`, `ADJUSTMENT`, `RETURN`) |
| `carts`, `cart_items` | Carrito del usuario |
| `orders`, `order_items`, `payments` | Pedido, sus líneas con el precio del momento y el pago simulado |
| `stylist_requests` | Registro de consultas a la IA (sin texto ni foto) para el límite diario |

El esquema también trae tablas del alcance original (avatares, favoritos,
reseñas y conversaciones de IA) que quedan para trabajo futuro.

### Decisiones del esquema

- **Stock como suma de movimientos.** No existe una columna «cantidad». El stock
  de una variante es `SUM(quantity_delta)` en `stock_movements`. Así hay una sola
  fuente de verdad y un historial completo.
- **Sin sobreventa.** Al pagar, la venta bloquea la fila de la variante
  (`SELECT … FOR UPDATE`), suma su stock y solo entonces registra el movimiento.
  Dos compras simultáneas no pueden llevarse la misma unidad.
- **Dinero exacto.** `NUMERIC(14,2)` en la base y `BigDecimal` en Java.
- **Fechas** en `TIMESTAMPTZ`, mostradas en la zona `America/Bogota`.
- **Validación al arrancar.** Con `ddl-auto=validate`, si las entidades y las
  tablas no coinciden, el servidor no arranca.

### Autenticación

1. `POST /auth/login` verifica la contraseña (BCrypt, costo 10) y entrega un
   token de acceso JWT de 15 minutos y uno de refresco de 30 días.
2. La app guarda el de acceso solo en memoria. El de refresco se guarda en la
   base como hash SHA-256 y se puede revocar.
3. Cada refresco revoca el token usado y entrega uno nuevo (rotación).
4. Al restablecer la contraseña se revocan todas las sesiones.

### Aislamiento entre usuarios

El `userId` sale siempre del token. Los repositorios buscan «el pedido X de este
usuario», así que el pedido de otro simplemente no existe para él: responde 404,
no 403, para no confirmar que existe.

### Estilista con IA

1. La app manda la ocasión, el presupuesto y, si la persona acepta, una foto.
2. El backend llama a Gemini por la API compatible con OpenAI con dos
   herramientas: `search_catalog`, que consulta la base de datos (solo
   productos activos y con stock), y `recommend_outfit`, que es obligatoria para
   responder.
3. El servidor revalida cada id, pone los precios desde la base de datos y, si
   la suma pasa del presupuesto, quita prendas.
4. Si la IA está apagada (`AI_ENABLED=false`), falla o no hay internet, responde
   un plan B por reglas. Hay un límite de 25 consultas por usuario al día.

### Errores

Un solo formato para todos los errores, con un código estable (`error.CODE`) y
el mensaje en español desde `messages.properties`. Los errores de validación
dicen qué campo falló.

### Migraciones

- `db/migration`: `V1` esquema inicial y `V2` registro del estilista.
- `db/dev`: `V900`–`V903`, catálogo y cuentas de prueba, solo con el perfil `dev`.
- Una migración ya aplicada nunca se edita: se crea la siguiente.

## App de escritorio

- **Electron** abre la ventana y da permiso solo a la cámara. La interfaz es
  **React 19 con TypeScript**, compilada con **Vite**, que le pone a la página
  una política de seguridad (CSP) estricta: solo agrega `'wasm-unsafe-eval'`,
  lo mínimo para correr MediaPipe.
- **Diseño:** tokens de color, tipografía y movimiento en `src/styles/tokens.css`
  y el sistema completo en [desktop/DESIGN.md](../desktop/DESIGN.md). Textos en
  español en `src/i18n/es.ts`.
- **Sesión:** el token de acceso vive en memoria; al vencer, la app lo renueva
  con el de refresco.

### Probador en vivo

Por cada cuadro de la cámara (unos 30 por segundo):

1. **MediaPipe Pose Landmarker** encuentra 33 puntos del cuerpo y la silueta de
   la persona. Corre en el equipo con WebAssembly y la GPU.
2. **La prenda se mide una vez** al cargarla: hombros, mangas, cuello o capucha y
   relieve, a partir de la silueta de la foto del producto.
3. **Malla con huesos:** la foto se vuelve una malla de triángulos con cinco
   huesos (torso, brazos y antebrazos). Se dobla con la persona, se ajusta al
   ancho real de su cuerpo y sube hasta sus hombros.
4. **Shader en WebGL2:** copia la luz y el color de la cámara, calcula volumen y
   sombras, y le pone el grano de una cámara web.
5. **Capas:** el fondo desenfocado, la persona, la sombra de la prenda, la prenda
   y, encima, la cabeza y las manos.

Cuesta unos 6 ms por cuadro, más unos 17 ms de la detección.

### Empaquetado

`npm run package` compila con Vite y empaqueta con **electron-builder** en
`OFFGRID.app` y un instalador `.dmg`. El `Info.plist` lleva el texto con el que
macOS pide permiso para la cámara.
