# Sistema de diseño

> **Versión 1.1, 19 de octubre de 2026 (estilo "drip").** El estudiante pidió vender streetwear de marca (Jordan, TN, Tech Fleece, Supreme, Sp5der, Corteiz, Chrome Hearts, Ralph Lauren, perfumes) con estética de rap y calle. Cambios sobre la 1.0:
> - **Héroe oscuro.** Fondo casi negro, la primera línea del titular en cromo (degradado plateado recortado al texto) y la segunda en negro sobre la franja lima, que ahora cubre las letras completas. Al fondo hay un foco de luz que sigue al mouse.
> - **Modelos.** Son los tres modelos de fotos libres de la 1.0 (Unsplash), que se turnan sobre el fondo oscuro, y el lookbook usa las fotos libres de calle. El 3 de noviembre se quitaron las fotos de Central Cee que había aquí, a pedido del estudiante.
> - **"Uno por uno".** Sección oscura que pasa los 10 tenis de a uno (cada 3.2 s, con pausa al pasar el mouse): el tenis entra rotado desde un lado y detrás aparece su modelo gigante en contorno (AJ4, AJ11, AJ3, TN).
> - **Lima más eléctrico** (`#d4ff3a`), que combina mejor con el negro y el cromo.
> - **Catálogo de 36 prendas.** 10 tenis, 6 chaquetas, 6 buzos, 2 camisetas, 4 gorros y gorras, 3 perfumes y accesorios, cada uno con su foto recortada.
>
> Las fotos de producto de esta versión son de terceros: de StockX y Nike, o prendas recortadas de las capturas del estudiante. Sirven para la demo académica, pero **no se suben a git**: viven en `backend/uploads/product-images/drip-*.webp`.

> Versión 1.0, 18 de octubre de 2026. El estudiante pidió quitar todo lo que se veía "de videojuego" (rareza, "drop", intro tipo tarjeta, prendas dibujadas con grano) y replicar la estética limpia de una tienda de moda de referencia: fondo blanco, titulares gigantes, acento verde lima, fotos reales y mucho movimiento. La 0.3 (papel, rojo y prendas dibujadas) queda en el historial de git.

## 1. Qué tomamos de la referencia

La referencia principal está en `docs/referencias/` (capturas de un video de una tienda de ejemplo llamada "NOVASHION", hecha con Next.js y GSAP). De ella tomamos **el estilo, la estructura y los patrones de movimiento**. No copiamos su nombre, sus textos ni sus fotos: toda la copia de OFFGRID es propia y en español.

| Patrón de la referencia | Cómo quedó en OFFGRID | Componente |
|---|---|---|
| Entrada en blanco que revela la tienda | Pantalla de carga blanca con el logo, contador 000→100 y línea lima; luego sube como un telón | `Preloader` |
| Titular gigante en dos líneas, la segunda en lima, con el modelo delante | "VISTE DIFERENTE / FUERA DEL SISTEMA": la segunda línea va en negro sobre una franja lima que se pinta como resaltador (así cumple el contraste) | `home/Hero` |
| Tarjeta flotante con avatares y texto | Tarjeta de vidrio con tres prendas reales y el total de prendas | `home/Hero` |
| Miniatura de video | "Lookbook": fotos que se suceden como un video, con pausa | `home/Hero` |
| "As featured in" | Cinta de las marcas que vende la tienda | `BrandMarquee` |
| Mosaico de colecciones | Cuatro tarjetas con foto, conteo real de prendas y flecha que gira | `Collections` |
| "New arrivals" con filtros en píldora | "Novedades" con filtros animados por categoría | `NewArrivals` |
| Vista rápida con tallas en círculo y botones CART / BUY NOW | Vista rápida con colores, tallas, "Agregar al carrito" (lima) y "Comprar ahora" (negro) | `store/QuickView`, `store/PurchasePanel` |
| Carrito lateral con botón lima | Mismo patrón, con fotos reales y total grande | `CartDrawer` |
| "Why choose us" con números grandes | "La diferencia OFFGRID" con cuatro ventajas reales de la app | `WhyUs` |
| Banner oscuro de suscripción | "Crea tu cuenta y guarda tu carrito": el correo pasa al registro | `JoinBanner` |
| Footer negro con cinta y marca gigante | Igual, con enlaces reales y créditos de las fotos | `SiteFooter` |

Lo que agregamos nosotros: **el efecto camaleón** al cambiar de color, **la prenda que vuela a la bolsa** al agregarla, **el parallax** del héroe con el mouse y **los modelos que se turnan**.

## 2. Color

Todo sale de `src/styles/tokens.css`; ningún componente tiene colores a mano.

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | blanco | Fondo general |
| `--color-tile` | gris cálido `#f0f0ed` | Fondo de las fotos de producto |
| `--color-text` | casi negro `#0c0b0a` | Texto y botón principal |
| `--color-accent` | lima `#dbf24a` | Botones de compra, filtros activos, puntos y franjas |
| `--color-accent-text` | oliva `#4f5c00` | Texto pequeño en lima sobre blanco |

**Contraste.** El lima sobre blanco no llega a 4.5:1, así que **nunca se usa para texto sobre blanco**: el texto va negro sobre lima (15.7:1) o en oliva sobre blanco (7.3:1). En las superficies oscuras (footer y banner) el lima sí va como texto, porque sobre negro supera 4.5:1.

## 3. Tipografía

Las mismas fuentes libres (SIL OFL) guardadas en `src/assets/fonts/`:
- **Anton** para titulares en mayúsculas, que es la condensada pesada que pide la referencia.
- **Archivo** para el texto y la interfaz.
- **Archivo itálica ancha** para el logo.

## 4. Fotos

- **Origen.** Todas las fotos son de Unsplash, con su licencia: uso libre, incluso comercial, sin pedir permiso. Los nombres de marcas (Nike, Jordan, Vans, Ray-Ban) se usan solo para nombrar los productos de una tienda multimarca de demostración y pertenecen a sus dueños. El footer lo dice.
- **Recorte.** El fondo de las fotos de producto y de los modelos se quitó en el Mac con el framework Vision de Apple, el mismo que usa "copiar sujeto" en Fotos, con un programa de 70 líneas en Swift. No se subió ninguna foto a servicios externos.
- **Peso.** Se exportaron a WebP con transparencia: productos a 1400 px (4.5 MB los 26) y modelos y escenas a 1800 px.
- **Dónde viven.** Las fotos de producto son datos del catálogo: están en el backend (`src/main/resources/catalog/`) y la base de datos guarda su ruta en `product_images`. Las de la portada son parte de la interfaz y van en `desktop/src/assets/home/`.

## 5. Efecto camaleón

Cada producto tiene una foto en un color: el "color de la foto", que la API manda como `photoColor`. Cuando se elige otro color:
1. Encima de la foto se pone una capa del color nuevo. Esa capa tiene como **máscara la misma foto recortada**, así solo pinta la prenda y nunca el fondo.
2. El color se mezcla con la foto con un modo de fusión de CSS:
   - Si la prenda de la foto es clara, se usa `multiply`: blanco × lima = lima, y se conservan las sombras.
   - Si es de tono medio, se usa `color`: cambia el tono pero conserva la luz del satín o del cuero.
3. El color nuevo entra como **una ola circular** que crece desde una esquina (una escala con `transform`). Detrás pasa un brillo que barre la prenda.

Volver al color original apaga la capa con un fundido. Las tarjetas del catálogo hacen lo mismo al pasar el mouse por los puntos de color.

## 6. Movimiento

Todo se anima con `transform` y `opacity`, y respeta "reducir movimiento" del sistema: la app usa `MotionConfig reducedMotion="user"` y las variables `--motion-amount` y `--motion-play`.

| Momento | Animación |
|---|---|
| Entrada | Contador y línea lima; el telón sube en 0.85 s |
| Héroe | Las líneas del titular suben desde una máscara, se pinta la franja lima, el modelo sube y las tarjetas entran por los lados. Los modelos se turnan cada 5.2 s y todo sigue al mouse con resortes. |
| Lookbook | Fundido entre fotos con un acercamiento lento (efecto Ken Burns) y botón de pausa |
| Secciones | Aparecen al hacer scroll (subida y fundido, una sola vez) |
| Filtros | La píldora activa se desliza entre opciones; las tarjetas se reacomodan con animación de layout |
| Tarjeta | La prenda flota y aparece "Vista rápida" (solo con mouse) |
| Vista rápida | Sube y escala desde 0.96 sobre un fondo desenfocado |
| Agregar al carrito | Una copia de la foto vuela en arco hasta la bolsa y la bolsa rebota |
| Cambio de color | Ola de color y brillo (efecto camaleón) |

## 7. Accesibilidad y escritorio

- Foco visible en todo y trampa de foco en la vista rápida y el carrito: Esc cierra.
- Atajos: `/` busca y `C` abre el carrito.
- Las tarjetas de producto son botones con su nombre ("Vista rápida de…").
- Colores y tallas son radios reales dentro de un `fieldset`, así se pueden usar con teclado y lector de pantalla.
- Las imágenes decorativas (modelos y escenas) no se anuncian.
- La ventana mínima es de 1024 × 680. Las grillas pasan de 4 a 3 columnas, y el banner y la vista rápida se apilan.

## 8. Pantallas

| Pantalla | Qué tiene |
|---|---|
| Entrada | Pantalla de carga blanca (una vez por sesión; Enter o clic la salta) |
| Inicio | Héroe, marcas, colecciones, novedades, ventajas, banner de cuenta y footer |
| Catálogo | Filtros en píldora con conteo, búsqueda y grilla de tarjetas |
| Producto | Foto grande fija a la izquierda con el camaleón, el panel de compra y "Combínalo con" |
| Vista rápida | La misma compra sin salir de la página |
| Carrito, pago, pedido, cuenta, login | Mismos tokens; fotos reales en cada línea |
