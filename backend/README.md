# OFFGRID: backend

API REST de la tienda: cuentas, catálogo, stock, carrito, pedidos con pago
simulado y estilista con IA. Toda cifra (stock, totales, precios que ve la IA)
se calcula aquí.

## Tecnologías

| Pieza | Versión | Para qué |
|---|---|---|
| Java | 21 (LTS) | Lenguaje |
| Spring Boot | 3.5 | Web, validación e inyección por constructor |
| Spring Security + jjwt | 6.5 / 0.13 | JWT, roles `CUSTOMER` y `ADMIN` |
| Spring Data JPA (Hibernate) | 3.5 | Acceso a datos con `ddl-auto=validate` |
| Flyway | 11 | Migraciones versionadas |
| springdoc-openapi | 2.9 | Swagger en `/docs` |
| PostgreSQL | 18 local o Supabase | Base de datos |
| Gemini (API compatible con OpenAI) | `gemini-3.5-flash-lite` | Estilista con IA |

## Puesta en marcha

### 1. Instalar un JDK 21 o superior

```bash
brew install openjdk@21
java -version
```

No hace falta Maven: se usa el *wrapper* (`./mvnw`).

### 2. Tener una base de datos PostgreSQL

```bash
# a) Local con Homebrew (lo que usa la demo)
brew install postgresql@18
brew services start postgresql@18
createdb flowstore

# b) Supabase: Project Settings → Database → Connection string → Session pooler
#    (la conexión directa solo tiene IPv6; el Transaction pooler rompe Flyway)
```

### 3. Configurar las variables de entorno

```bash
cp .env.example .env
```

| Variable | Para qué |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexión a PostgreSQL |
| `JWT_SECRET` | Firma de los tokens, mínimo 32 bytes: `openssl rand -base64 48` |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos (por defecto `http://localhost:5173`) |
| `STORAGE_BASE_PATH` | Carpeta de archivos subidos (por defecto `./uploads`) |
| `AI_ENABLED`, `AI_API_KEY` | Encender el estilista y su clave gratuita de Google AI Studio |
| `AI_BASE_URL`, `AI_MODEL`, `AI_DAILY_LIMIT` | Proveedor, modelo y consultas por usuario al día (25) |

El `.env` está en `.gitignore`. Las variables del sistema ganan sobre el `.env`.

### 4. Levantar el servidor

Con la base local y los datos de prueba (perfil `dev`):

```bash
SPRING_PROFILES_ACTIVE=dev DB_URL=jdbc:postgresql://localhost:5432/flowstore DB_USERNAME=$USER DB_PASSWORD= ./mvnw spring-boot:run
```

Con los valores de `.env` (por ejemplo, Supabase):

```bash
./mvnw spring-boot:run
```

### 5. Probar que anda

```bash
curl http://localhost:8080/api/v1/products?size=1
```

Y la documentación interactiva en **http://localhost:8080/docs**.

## Endpoints

Base `/api/v1`. El catálogo es público; lo demás exige `Authorization: Bearer <token>`.

### Autenticación

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/auth/register` | Crea la cuenta y devuelve los tokens |
| `POST` | `/auth/login` | Inicia sesión |
| `POST` | `/auth/refresh` | Cambia el token de refresco por uno nuevo (rotación) |
| `POST` | `/auth/logout` | Revoca el token de refresco |
| `POST` | `/auth/forgot-password`, `/auth/reset-password` | Recuperar la contraseña |

### Perfil, catálogo y carrito

| Método | Ruta | Qué hace |
|---|---|---|
| `GET`, `PUT` | `/me` | Datos y medidas del usuario |
| `GET` | `/products`, `/products/{id}`, `/categories` | Catálogo con filtros, búsqueda y paginación |
| `GET` | `/cart` | Carrito del usuario |
| `POST` | `/cart/items` | Agrega una variante (color y talla) |
| `PUT`, `DELETE` | `/cart/items/{variantId}` | Cambia la cantidad o la quita |

### Pedidos

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/orders` | Crea el pedido desde el carrito y cobra con el pago simulado |
| `GET` | `/orders`, `/orders/{id}` | Pedidos del usuario; uno ajeno responde 404 |

### Estilista con IA

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/stylist/outfits` | Arma un look con productos reales (foto opcional, con consentimiento) |
| `GET` | `/stylist/status` | Si la IA está encendida y cuántas consultas quedan hoy |

### Administración (solo `ADMIN`)

| Método | Ruta | Qué hace |
|---|---|---|
| `POST`, `PUT` | `/products`, `/products/{id}` | Crear y editar productos |
| `POST` | `/products/{id}/variants` | Agregar una variante |
| `POST` | `/products/{id}/variants/{variantId}/restock` | Entrada de inventario (movimiento de stock) |
| `POST`, `PUT` | `/categories`, `/categories/{id}` | Crear y editar categorías |

### Errores

Todos los errores tienen el mismo formato y el mensaje en español, sacado de
`messages.properties`. Las validaciones de Bean Validation devuelven además el
campo que falló.

## Decisiones de diseño

- **Stock = suma de `stock_movements`.** Nunca un número que se edita: cada
  entrada, venta o devolución es un movimiento.
- **El total del pedido sale de sus líneas** y cada línea guarda el precio del
  momento de la compra.
- **Dinero en `BigDecimal` / `NUMERIC(14,2)`**, nunca `float`.
- **El `userId` sale del JWT.** Un recurso de otro usuario responde 404, no 403.
- **Tokens:** acceso de 15 minutos; refresco de 30 días, revocable, guardado
  como SHA-256. Contraseñas con BCrypt (costo 10).
- **La IA no inventa:** consulta el catálogo con una herramienta, el servidor
  revalida cada id y pone los precios; si falla, responde un plan B por reglas.

Detalle en [../docs/arquitectura.md](../docs/arquitectura.md) y
[../docs/01-decisiones.md](../docs/01-decisiones.md).

## Estructura

```
src/main/java/com/flowstore/backend/
├── auth/       registro, login, tokens y recuperación de contraseña
├── user/       perfil y medidas
├── catalog/    productos, variantes, categorías e imágenes
├── stock/      movimientos de inventario
├── cart/       carrito
├── order/      pedidos y sus líneas
├── payment/    pago simulado
├── stylist/    estilista con IA y plan B por reglas
├── config/     seguridad, CORS, archivos estáticos y propiedades
└── shared/     errores y utilidades comunes
src/main/resources/
├── db/migration/   V1 esquema, V2 registro del estilista
├── db/dev/         V900–V903 datos de prueba (solo perfil dev)
└── messages.properties
```

## Pruebas

```bash
./mvnw test
```

59 pruebas (JUnit, Mockito y Spring Test): registro e inicio de sesión,
validaciones, permisos por rol, cálculo de pedido y stock, aislamiento entre
usuarios, carrito, estilista y pago simulado. No necesitan base de datos ni red.

## Convenciones

Código en inglés y sin comentarios; textos para el usuario en español en
`messages.properties`. Un paquete por concepto, inyección por constructor y DTOs
como `record`. Nunca se edita una migración aplicada: se crea la siguiente.
