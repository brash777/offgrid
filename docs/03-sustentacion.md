# Sustentación de OFFGRID: guion y preguntas

Lunes 23 de noviembre de 2026. Duración pensada: 6–7 minutos de exposición y demo, más preguntas.

## Antes de empezar (10 minutos antes)

1. Doble clic en `scripts/start-demo.command`. Enciende la base de datos y el backend y abre la app.
2. Iniciar sesión con `cliente@flowstore.app` / `Cliente123!` (para el estilista con IA).
3. Probar la cámara una vez: tecla `M` → «Activar cámara». Buena luz de frente y a un metro de la pantalla.
4. Tener abierta en otra pestaña http://localhost:8080/docs (Swagger) por si piden ver la API.
5. Si algo falla: la cámara tiene el respaldo «Usar una foto», y el estilista responde por reglas si no hay internet.

## Guion

**1. Qué es (30 s).**
«Este es OFFGRID, una tienda de streetwear de escritorio para Mac. Tiene dos cosas que la hacen diferente: un **probador en vivo**, donde la cámara funciona como espejo y la prenda te aparece puesta, y un **estilista con inteligencia artificial** que te arma un look solo con productos reales de la tienda. Lo hice yo solo: el backend, la app de escritorio y el diseño.»

**2. La tienda (1 min). Mostrar: portada → catálogo → producto → carrito → pago.**
«La portada usa una sesión de fotos de estudio con un efecto de profundidad: el título queda detrás de los modelos y se mueve con el mouse. Las tarjetas son de vidrio. En el catálogo filtro por categoría y busco; en el producto elijo color y talla y veo el stock real. Agrego al carrito y hago el pago, que es simulado con una tarjeta de prueba. El pedido queda guardado en mi cuenta.»

**3. El probador en vivo (1 min 30 s). Mostrar: tecla `M`, cámara, cambiar prendas, tecla `F`.**
«Con la tecla M abro el probador. Uso MediaPipe, un modelo de visión de Google que corre en el mismo computador, sin internet y sin pagar. Encuentra 33 puntos del cuerpo y separa a la persona del fondo. Con eso la foto del producto se convierte en una malla que se dobla con mis hombros y mis brazos, como la piel de un personaje de videojuego. También mide mi silueta para ajustar el ancho, copia la luz de la cámara y le pone sombras y volumen. Al cambiar de prenda, la nueva baja como cuando uno se pone un buzo. Con la F se desenfoca el fondo, como el modo retrato del celular. La imagen de la cámara no se guarda ni se envía a ningún lado.»

**4. El estilista con IA (1 min). Mostrar: pestaña «Estilista IA», pedir «algo para una fiesta, máximo 800 mil».**
«Aquí le pido un look para una ocasión y un presupuesto. Usa Gemini de Google, pero la IA no inventa productos: tiene que buscar en mi base de datos con una herramienta, y el servidor vuelve a revisar cada producto y cada precio antes de mostrarlo. Si se pasa del presupuesto, el servidor quita prendas. Y si la IA falla o no hay internet, responde un plan B por reglas: la demo nunca se cae. La prenda que se puede probar se pone sola en el espejo.»

**5. Cómo está hecho (1 min 30 s).**
«Son dos partes que se hablan por una API REST:
- El **backend** está en Java 21 con **Spring Boot 3.5**. Usa Spring Security con tokens JWT, JPA con Hibernate, Flyway para las migraciones y **PostgreSQL** como base de datos. La documentación de la API está en Swagger.
- La **app de escritorio** está hecha con **Electron**, **React 19** y **TypeScript**, empaquetada con **Vite**. Las animaciones son con la librería Motion y la visión es MediaPipe con WebGL.
- Para volverla una app instalable usé **electron-builder**: compila la interfaz y la empaqueta con Electron en una app de Mac, `OFFGRID.app`, y un instalador `.dmg`. (Una APK es el formato de Android; el equivalente en Mac es el `.app` o el `.dmg`).
- Algunas reglas que cuidé: el dinero se guarda como decimal exacto, nunca como `float`. El stock no es un número que se edita, sino la suma de todos los movimientos de entrada y salida. Las contraseñas van con BCrypt, y un usuario nunca puede ver los pedidos de otro. Hay 59 pruebas automáticas que pasan.»

**6. Cierre (20 s).**
«En resumen: una tienda completa, de punta a punta, con un probador que funciona en vivo y una IA que solo recomienda lo que de verdad hay. Como trabajo futuro quedan el avatar 3D y la simulación real de tela. Gracias.»

## Preguntas que te pueden hacer

**¿Qué frameworks y lenguajes usaste?**
Backend: Java 21, Spring Boot 3.5 (Spring Web, Spring Security, Spring Data JPA), Flyway, springdoc-openapi (Swagger), Maven y PostgreSQL. Escritorio: Electron 44, React 19, TypeScript, Vite, Motion y MediaPipe Tasks Vision con WebGL2.

**¿Por qué Electron y no una app nativa?**
Con una sola base de código web tengo una app de escritorio real: acceso a la cámara, ventana propia e instalador. Además puedo usar MediaPipe y WebGL, que corren en el navegador con la GPU.

**¿Por qué Spring Boot?**
Es el estándar en Java para APIs. Trae seguridad (Spring Security), acceso a datos (JPA) y validación, y con Flyway la base de datos queda versionada como el código.

**¿Cómo se comunican la app y el servidor?**
Por HTTP con JSON (API REST). Al iniciar sesión, el servidor da un token de acceso de 15 minutos, que la app guarda solo en memoria, y uno de refresco de 30 días que se puede revocar. Cada petición lleva el token y el servidor saca de ahí quién es el usuario.

**¿Cómo funciona la seguridad?**
Las contraseñas se guardan con BCrypt (costo 10). Los tokens de refresco se guardan como hash SHA-256. El `userId` sale siempre del token, nunca de lo que mande el cliente. Si alguien pide un pedido de otro, el servidor responde 404, para no confirmar que existe. Las rutas de administración son solo para el rol ADMIN.

**¿Cómo calculas el stock?**
No hay un campo «cantidad» que se edite. Cada entrada o venta es un movimiento en `stock_movements`, y el stock es la suma. Así hay una sola fuente de verdad y queda historial. El total del pedido también se calcula desde sus líneas, y cada línea guarda el precio del momento de la compra.

**¿Por qué el dinero en `BigDecimal` y no `double`?**
Porque `double` tiene errores de redondeo (0,1 + 0,2 no da exacto). En pesos colombianos se usa `NUMERIC(14,2)` en la base de datos y `BigDecimal` en Java.

**¿Cómo funciona el probador por dentro?**
1. MediaPipe da los puntos del cuerpo y una máscara de la persona.
2. La foto del producto se mide sola: dónde están los hombros, las mangas y el cuello.
3. La foto se vuelve una malla de triángulos con cinco «huesos» (torso, brazos y antebrazos) que siguen los puntos del cuerpo (*skinning*).
4. Un *shader* en la tarjeta de video le pone luz, volumen y sombras según la cámara.
5. La cabeza y las manos se vuelven a dibujar encima para que la capucha quede detrás.

**¿La IA de visión manda mi imagen a internet?**
No. MediaPipe corre en el equipo. La cámara se apaga al cerrar el panel y nada se guarda. La única foto que sale es la que la persona decide mandarle al estilista, con su permiso, y el servidor no la guarda.

**¿Cómo evitas que la IA invente productos o precios?**
La IA no recibe el catálogo en el texto: tiene que consultar la base de datos con una herramienta (*tool calling*) y responder con los ids de productos. El servidor revisa que existan, que estén activos y con stock, y los precios los pone él desde la base de datos.

**¿Qué pasa si se cae la IA o no hay internet?**
Hay un interruptor `AI_ENABLED` y un plan B por reglas que lee la ocasión y el presupuesto. Además hay un límite de 25 consultas por usuario al día.

**¿Dónde están las claves?**
Solo en `backend/.env`, que no se sube a git. La app de escritorio nunca ve la clave de la IA: le habla a mi servidor y el servidor le habla a Gemini.

**¿Qué pruebas hiciste?**
59 pruebas automáticas con JUnit, Mockito y Spring Test: registro e inicio de sesión, permisos, cálculo de pedido y stock, que un usuario no vea datos de otro, el estilista y el pago simulado. Se corren con `./mvnw test`.

**¿Por qué no hiciste el avatar 3D que estaba en el alcance?**
Un avatar fiel desde una foto requiere servicios de pago o mucha GPU. Lo cambié por el probador en vivo, que corre gratis en el equipo y se ve más real porque eres tú en la cámara. El cambio quedó documentado en `docs/00-alcance.md`.

**¿Cómo la volviste aplicación?**
Con electron-builder. `npm run package` compila la interfaz con Vite y la empaqueta con Electron en `OFFGRID.app` y en un `.dmg`. Al instalarla, macOS pide permiso para la cámara con un texto en español.

**¿Cómo manejaste el código?**
Con Git: una rama por funcionalidad, commits en español, uno por cambio, y el repositorio en GitHub. Las decisiones técnicas están en `docs/01-decisiones.md`.

**¿Qué mejorarías?**
Simular la tela en 3D, prendas de abajo (pantalones), pagos reales con una pasarela y publicar la app firmada para Windows y Mac.
