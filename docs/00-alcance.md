# FlowStore · Documento de alcance (Fase 0)

> Borrador para aprobación · 12 de octubre de 2026
> Sustentación: lunes 19 de octubre de 2026 (por confirmar)

## 1. La idea

FlowStore es una tienda de ropa de escritorio con look de videojuego. La persona sube una foto, la app arma un avatar 3D estilizado y puede **equiparle** al avatar cualquier prenda del catálogo antes de comprar (probador virtual). La compra funciona de punto a punto (carrito, pedido, stock, pago simulado) y una IA hace de estilista usando únicamente productos reales de la base de datos.

## 2. Restricciones que condicionan todo

| Restricción | Consecuencia |
|---|---|
| Un solo desarrollador, 7 días | MVP estricto. Todo lo que no esté en P0 compite con el tiempo de pulir la demo. |
| Sin presupuesto para IA de pago | La IA corre sobre un proveedor gratuito que el estudiante ya tenga, y hay un modo de respaldo que no depende de ninguna IA. |
| 15 a 25 prendas 3D hechas con Blender | Catálogo pequeño pero cuidado. Una prenda = un modelo 3D; los colores son variantes del mismo modelo (no cuestan modelo nuevo). |
| La demo tiene que funcionar en vivo | Cada punto frágil (IA, avatar, internet) tiene un respaldo. |

## 3. Qué se promete y qué no

(Anticipo. El enfoque definitivo del avatar se compara y se confirma en la Fase 1.)

**Se promete**
- Un avatar 3D **estilizado** (estética de videojuego) que toma de la foto el tono de piel, el color y el estilo del cabello y rasgos simples (barba, lentes), y de las medidas la contextura.
- Probador en tiempo real: equipar y quitar prendas por ranura, rotar y hacer zoom al personaje.

**No se promete**
- Una réplica 3D exacta de la cara o el cuerpo de la persona. Eso exige servicios de pago o GPU potente y no cabe en presupuesto ni en tiempo.

## 4. Funciones por prioridad

### P0 · MVP (sin esto no hay demo)
1. **Cuentas y roles**: registro, login, refresh, logout. Roles CUSTOMER y ADMIN.
2. **Catálogo**: categorías, productos, variantes (talla y color), imágenes, filtros y búsqueda por texto.
3. **Administración** (solo ADMIN): crear y editar productos, variantes y stock; subir el modelo 3D de cada prenda.
4. **Avatar**: subir foto → avatar estilizado. Editor manual de rasgos como respaldo. Borrar foto y avatar.
5. **Probador**: equipar y quitar por ranura (cabeza, torso, piernas, pies, accesorio), elegir color y talla, guardar y cargar outfits.
6. **Compra**: carrito, pedido (total calculado desde sus líneas, precio congelado al comprar), stock por movimientos, pago simulado, historial de pedidos.
7. **IA de mayor impacto**: (a) estilista virtual en chat y (b) outfit por ocasión y presupuesto, que se equipa solo en el avatar. Ambas usan solo productos reales del catálogo.
8. **App de escritorio** con todo lo anterior.

### P1 · si sobra tiempo (en este orden)
1. Completar el look (dada una prenda, qué combina).
2. Búsqueda en lenguaje natural ("chaqueta negra oversize barata").
3. Favoritos.
4. Recomendación de talla según medidas (reglas simples, sin IA).
5. Recuperación de contraseña (enlace en consola en perfil dev; sin correo real).

### P2 · trabajo futuro (se menciona en la sustentación, no se construye)
- Reseñas y resumen de reseñas con IA.
- Descripción y etiquetas automáticas desde la foto de un producto (admin).
- Estimación de proporciones corporales desde la foto.

### Fuera de alcance
- Pasarela de pago real, envíos y transportadoras, factura electrónica.
- Envío: no se modela (gratis), así el total del pedido es solo la suma de sus líneas.
- App móvil o web pública. Solo escritorio.
- Varios idiomas o monedas. Solo español y COP.
- Cupones, devoluciones, notificaciones por correo.
- Simulación física de tela y ajuste a cualquier cuerpo: la ropa se diseña para un cuerpo base con variaciones limitadas.

## 5. Datos que se guardan

| Dato | Para qué | Manejo |
|---|---|---|
| Email y contraseña | Cuenta | La contraseña solo como hash BCrypt. Nunca en logs. |
| Medidas (estatura, contextura, talla habitual) | Contextura del avatar y talla sugerida | Visibles solo para su dueño; editables y borrables. |
| **Foto original** | Generar el avatar | **Dato sensible.** Se avisa y se pide aceptación antes de subirla. Por defecto se procesa y se descarta (guardarla es opcional). Borrable en cualquier momento. Nunca se sirve públicamente. Si el análisis lo hace un proveedor externo de IA, la foto sale a un tercero y el aviso lo dice. |
| Avatar (rasgos en JSON, modelo, estado de generación) | Mostrar al personaje | Del usuario; para otros usuarios responde 404. |
| Catálogo (productos, variantes, imágenes, assets 3D) | Tienda | Lectura pública; escritura solo ADMIN. |
| Carrito, pedidos, líneas y pagos simulados | Compra | La línea guarda el precio del momento; el total siempre se calcula. No se guarda ningún número de tarjeta. |
| Movimientos de stock | Inventario | Stock = suma de movimientos. |
| Outfits guardados y favoritos | Experiencia | Del usuario. |
| Conversaciones y mensajes de IA | Historial del estilista | Del usuario, borrables. Al proveedor solo se envía el texto necesario (nunca email, contraseña ni foto en el chat). |
| Refresh y reset tokens | Sesión | Solo su hash SHA-256. |

Para la sustentación: el tratamiento de la foto sigue la lógica de la Ley 1581 de 2012 (habeas data): finalidad clara, consentimiento y derecho a borrar.

## 6. Plan de 7 días

| Día | Fecha | Trabajo |
|---|---|---|
| 1 | lun 12 | Fase 0 y Fase 1. Instalar Blender. Confirmar proveedor de IA. |
| 2 | mar 13 | Fases 2 y 3: esqueleto, Supabase, Flyway V1, seguridad y usuarios. En paralelo: cuerpo base y primeras prendas en Blender. |
| 3 | mié 14 | Fases 4 y 6: catálogo, administración, compra. Prendas 3D hasta llegar a 15. **Aquí necesito tus imágenes de referencia de diseño.** |
| 4 | jue 15 | Fases 5 y 7: avatar, outfits e IA. Tokens de diseño y styleguide. Arranca la app de escritorio. |
| 5 | vie 16 | Escritorio: login, catálogo, probador 3D. |
| 6 | sáb 17 | Escritorio: carrito y compra, estilista, panel admin. Se congelan las funciones por la noche. |
| 7 | dom 18 | Pruebas, pulido, video de respaldo de la demo, Fase 8 (README, docs, preguntas del profesor). |
| — | lun 19 | Sustentación. |

El plan es ajustado. Si algo se atrasa, se recorta P1 antes de tocar P0.

## 7. Riesgos y respaldos

| Riesgo | Respaldo |
|---|---|
| El avatar desde la foto sale mal | Editor manual de rasgos y avatares predefinidos. Se prueba la demo con 2 o 3 fotos de antemano. |
| La IA externa se cae o se acaba la cuota gratuita | Interruptor `AI_ENABLED`, límite por usuario y modo respaldo: outfits por ocasión armados con reglas sobre el catálogo (sin LLM) y respuestas preparadas en el chat. |
| Las prendas 3D toman más tiempo del previsto | Bajar a 15 prendas, reutilizar un modelo con varios colores, priorizar camisa, pantalón, chaqueta, zapatos y gorra. |
| Sin internet o Supabase pausado el día de la sustentación | Verificar el proyecto de Supabase el domingo (los gratuitos se pausan por inactividad). Datos del celular como respaldo. Video de la demo grabado el domingo. |
| El tiempo no alcanza | Recortar P1 antes de tocar P0. |

## 8. Decisiones tomadas

- **Compra**: el catálogo se puede ver sin cuenta; avatar, carrito y compra requieren sesión.
- **Recuperación de contraseña**: sin correo real, es P1.
- **IA**: proveedor gratuito mediante un cliente HTTP compatible con OpenAI, configurable por variables de entorno. Reemplaza al SDK de Anthropic del stack original. *Pendiente de aprobación.*
- **Java**: el equipo tiene JDK 25; se compila con destino Java 21 y se verifica al arrancar en la Fase 2.
- **Modelos 3D**: se generan con scripts de Blender versionados en el repo (reproducibles y explicables).

## 9. Pendiente para aprobar la Fase 0

1. Confirmar la fecha de la sustentación.
2. Qué API de IA gratuita tiene el estudiante, y aprobar el cambio del SDK de Anthropic.
3. Cómo se instala Blender.
4. Si se agrupan las fases para tener menos paradas de revisión.
