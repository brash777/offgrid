# Backend de OFFGRID

API REST de la tienda. Java (compila para 21), Spring Boot 3.5, Spring Security 6 con JWT (jjwt), Spring Data JPA con Hibernate, Flyway, springdoc-openapi y PostgreSQL.

## Correr

Con la base local (lo que usa la demo):

```bash
SPRING_PROFILES_ACTIVE=dev DB_URL=jdbc:postgresql://localhost:5432/flowstore DB_USERNAME=$USER DB_PASSWORD= ./mvnw spring-boot:run
```

Sin esas variables usa las de `backend/.env` (por ejemplo, Supabase por el *Session pooler*). Las variables del sistema ganan sobre el `.env`.

- Swagger: http://localhost:8080/docs
- Pruebas: `./mvnw test` (59 pruebas: registro e inicio de sesión, permisos, cálculo de pedido y stock, que nadie vea datos de otro, estilista y pago simulado).

## Variables de entorno

Solo en `backend/.env` (ignorado por git); `backend/.env.example` tiene los nombres sin valores.

| Variable | Para qué |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexión a PostgreSQL |
| `JWT_SECRET` | Firma de los tokens (mínimo 32 bytes) |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos (por defecto `http://localhost:5173`) |
| `STORAGE_BASE_PATH` | Carpeta de archivos subidos (por defecto `./uploads`) |
| `AI_ENABLED`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_DAILY_LIMIT` | Estilista con IA (Gemini por la API compatible con OpenAI) |

## Organización

Un paquete por concepto: `auth`, `user`, `catalog`, `stock`, `cart`, `order`, `payment`, `stylist`, más `config` y `shared`. Inyección por constructor, DTOs como `record` con Bean Validation y mensajes en español en `messages.properties`.

## Base de datos

- Migraciones de Flyway en `db/migration` (`V1` esquema, `V2` registro del estilista). Una migración aplicada nunca se edita: se crea la siguiente.
- Datos de prueba en `db/dev` (`V900`–`V903`), solo con el perfil `dev`.
- El stock es la suma de `stock_movements` y el total del pedido se calcula desde sus líneas; el dinero va en `NUMERIC(14,2)` / `BigDecimal`.

## Seguridad

Contraseñas con BCrypt (costo 10). Token de acceso de 15 minutos y de refresco de 30 días, revocable y guardado como SHA-256. El `userId` sale siempre del JWT, y un recurso de otro usuario responde 404. Lo de administración es solo para `ADMIN`.
