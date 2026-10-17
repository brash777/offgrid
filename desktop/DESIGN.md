# Sistema de diseño

> Versión 0.3, 12 de octubre de 2026. La 0.2 pasó del estilo "lobby gamer" oscuro a uno **limpio y editorial**, como el de las tiendas de las referencias. La 0.3 cambia la marca a **OFFGRID**, con el logo que eligió el estudiante. Lo "videojuego" queda en la intro, el globo que gira, la rareza y el probador 3D.

## 1. Qué tomamos de cada referencia

Las capturas están en `docs/referencias/`. De ellas tomamos **el estilo y los patrones de interacción**. No copiamos textos, logos, nombres, fotos ni marcas: Broken Planet, Hellstar, Racer Worldwide, NoFaith, Novashion y las demás son marcas reales y no aparecen en la app.

| Referencia | Qué tomamos | Dónde se ve |
|---|---|---|
| Broken Planet (plantilla Eyezy) | Encabezado con menú diminuto a la izquierda, logo al centro y "CARRITO (n)" a la derecha. Grilla de producto sin tarjetas, sobre fondo claro, con nombre en mayúsculas pequeñas y precio debajo. Bloque central "no todos pueden tener…". Detalle de producto en tres columnas con botón negro "AGREGAR AL CARRITO — precio". | `SiteHeader`, `ProductCard`, `HomePage`, `ProductPage` |
| Tarjeta OFFGRID (elegida por el estudiante) | El logo completo: globo de alambre, nombre en itálica ancha, ®, estrella de cuatro puntas, "OUT OF THE SYSTEM." y la tarjeta negra con "05." | `BrandLogo`, `IntroSplash` |
| Hellstar | Héroe rojo a pantalla completa con fundido entre escenas, titular condensado e inclinado abajo a la izquierda y botón negro cuadrado. Prenda flotando sobre fondo claro en el detalle. | `Hero`, `ProductPage` |
| Racer Worldwide / NoFaith Studios | Cinta de anuncios arriba de todo y palabra gigante detrás de la imagen. Marca gigante al pie. | `Marquee`, `Hero` (palabra de fondo), `SiteFooter` |
| VEAN / tienda 3D | Intro antes de entrar, con "ENTRAR". | `IntroSplash` |
| Novashion | Titulares condensados en negrita y alto contraste. | Escala tipográfica (Anton) |
| Página de tenis por color | La prenda cambia de color al elegir la variante. | `ProductCard` (muestras), `ProductPage` |

Lo que agregamos nosotros: **las prendas dibujadas por capas** que toman el color real de la base de datos, **la rareza estilo videojuego** (Común, Raro, Épico, Legendario según el precio) y **la lupa** en el detalle de producto.

## 2. Nombre y logo

La tienda se llama **OFFGRID** ("fuera de la red"), con la frase **OUT OF THE SYSTEM.** Nombre y frase son contenido de marca: viven en `src/brand.ts` y se muestran tal cual, en inglés.

El logo es un SVG hecho en código (`BrandLogo`), no una imagen, así que se ve nítido en cualquier tamaño y toma el color del texto (blanco sobre oscuro, negro sobre papel). Tiene dos versiones:

- **Completo** (intro, héroe, styleguide): globo de alambre con líneas horizontales rectas y meridianos curvos, "OFFGRID" encima, ®, estrella de cuatro puntas y la frase. Alrededor de las letras el globo se corta con una máscara, así las líneas nunca pasan por encima del nombre, sea cual sea el fondo. En la intro y el héroe el globo gira: cada meridiano es una elipse que se encoge y se estira con `scaleX`, desfasada de las demás. Con "reducir movimiento" queda quieto.
- **Solo nombre** (encabezado, pie de página): "OFFGRID" y ®.

Las letras llevan un filtro de desgaste leve, como el estampado gastado de la referencia.

**El ®** significa "marca registrada". Para la universidad es parte del diseño, pero antes de usar el nombre afuera hay que registrarlo; si no, se quita el símbolo.

## 3. Tipografía

Las tres familias son libres (licencia SIL OFL) y están en `src/assets/fonts/` con sus licencias. La app no descarga nada de internet.

| Uso | Fuente | Por qué |
|---|---|---|
| Logo | Archivo, itálica, ancho 125 % y peso 900 | La más parecida a las letras del logo OFFGRID entre ocho fuentes libres comparadas. |
| Frase de marca y "05." | Michroma | Ancha y geométrica, como "OUT OF THE SYSTEM." en la referencia. |
| Titulares | Anton | Condensada y pesada, en mayúsculas: el "HELLSTAR COLLECTION!" y el "EVERYBODY CAN'T HAVE LIMITED ITEMS" de las referencias. En el héroe se inclina 8° con `skewX`. |
| Texto e interfaz | Archivo recta (variable, peso 100–900 y ancho 62–125 %) | La misma familia del logo, así toda la tienda tiene una sola voz. Reemplazó a Inter Tight, que el detector de Impeccable marcó como fuente sobreusada. Menús, botones, nombres y precios en mayúsculas pequeñas con espaciado (`--letter-spacing-caps`). |

Escala: 12 px para etiquetas, 13 y 15 px para texto, y titulares de 36 px hasta 120 px (`--font-size-display`, se ajusta al ancho de la ventana).

## 4. Color

Todo color vive en `src/styles/tokens.css`. Ningún componente tiene colores escritos a mano. Hay dos capas:

- `--palette-*`: los valores crudos.
- `--color-*`: el significado. Los componentes solo usan estos.

**Superficies.** La tienda es clara (papel). `data-surface="ink"` cambia los tokens a la versión oscura (intro, pie de página, notificaciones) y `data-surface="hero"` a la del héroe (texto blanco y botón negro sobre rojo).

| Rol | Token | Valor | Contraste |
|---|---|---|---|
| Fondo | `--color-bg` | `#f4f3ef` | |
| Fondo de producto | `--color-tile` | `#ebe9e4` | |
| Texto | `--color-text` | `#0b0b0c` | 17.7:1 |
| Texto secundario | `--color-text-muted` | `#55555b` | 6.7:1 |
| Botón principal | `--color-primary` | `#0b0b0c` | 18.9:1 con su texto |
| Acento (drop, últimas unidades) | `--color-accent` | `#d4231b` | 4.7:1 |
| Héroe | `--color-hero` | `#d4231b` | 5.2:1 con texto blanco |
| IA | `--color-ai` | `#5a37e6` | 6.1:1 |

El styleguide calcula todos los contrastes en vivo. Los bordes de los controles cumplen 3:1.

## 5. Prendas

`src/components/garment/` dibuja 17 tipos de prenda (camiseta, manga larga, bomber, denim, rompevientos, jean, cargo, jogger, short, tenis, bota, sandalia, gorra, trucker, cadena, lentes y mochila). Cada una se arma con piezas reutilizables:

- `Part`: una pieza con su color, textura (sarga, rib, waffle, ripstop, malla, reata) y luz de estudio.
- `Shade` y `Light`: pliegues y brillos difuminados, recortados a la pieza.
- `Seam`, `Stitch`, `Rib`, `Zipper`, `Rivet`, `Cord`: costuras, pespuntes, puños, cremalleras, remaches y cordones.
- Un filtro de grano de tela y una sombra en el piso para que parezca foto de estudio.

El color sale del `colorHex` de la variante. Así la misma prenda funciona en negro, rojo o verde neón sin dibujarla otra vez.

## 6. Movimiento

Revisado con las skills de Emil Kowalski (`review-animations`, `emil-design-eng`) y la auditoría de Impeccable.

- Solo se anima `transform` y `opacity`.
- Interfaz por debajo de 300 ms; el héroe (momento de marca) puede ser más largo. Curva de entrada `--ease-out`, de cajón `--ease-drawer`.
- **Reducir movimiento es más suave, no cero.** Dos tokens lo controlan: `--motion-amount` (1 normal, 0 reducido) multiplica cada desplazamiento, así los fundidos se mantienen pero nada se mueve; `--motion-play` pausa las animaciones decorativas que se repiten (cinta, prenda flotando, brillo de la intro, skeleton). Antes había un "apagado" global que también borraba la retroalimentación útil.
- Los efectos de hover solo se activan con mouse (`@media (hover: hover) and (pointer: fine)`).
- Los botones se encogen un 3 % al presionarlos.
- Abrir el carrito con la tecla `C` no se anima: lo que se hace con el teclado muchas veces al día debe ser instantáneo.
- El cambio de página es una entrada CSS de 280 ms, sin animación de salida.
- El héroe avanza solo cada 6.5 s, se pausa con el mouse, tiene botón de pausa y flechas, y la barra de progreso muestra cuánto falta. Mientras rota solo, el lector de pantalla no anuncia cada escena.
- El logo se dibuja en dos capas: el globo que gira va separado de las letras con filtro de desgaste, para no recalcular el filtro en cada cuadro.

| Patrón | Componente | Cómo funciona |
|---|---|---|
| Intro | `IntroSplash` | Réplica de la tarjeta OFFGRID: el globo gira, un brillo respira detrás y la tarjeta aparece con un leve zoom. Enter o Esc para entrar. |
| Héroe | `Hero` | Las escenas se funden. La prenda entra girando y flota. La palabra gigante de fondo se desliza. |
| Cambio de página | `App` | La página nueva entra desde abajo con un fundido corto. |
| Grilla | `ProductGrid` | Las tarjetas entran escalonadas, 50 ms entre una y otra. |
| Tarjeta | `ProductCard` | Al pasar el mouse la prenda se acerca. Al pasar por una muestra de color, la prenda se funde a ese color. |
| Categorías | `HomePage` | La fila activa se corre y se inclina, aparece la flecha y la vista previa cambia de prenda. |
| Detalle | `ProductPage` | El cambio de color desliza la prenda. La lupa acerca la zona donde está el mouse. |
| Carrito | `CartDrawer` | Entra desde la derecha sobre un fondo oscurecido. |
| Cinta | `Marquee` | Desplazamiento infinito que se pausa con el mouse. |

## 7. Accesibilidad y escritorio

- Íconos dibujados en SVG (`Icon`), con un solo grosor de trazo; nada de caracteres Unicode como íconos.
- Barra de scroll, cursor de texto y selección con los colores de la marca.
- Contenido limitado a 1600 px de ancho para pantallas muy grandes.

- Foco siempre visible: anillo negro sobre papel y blanco sobre superficies oscuras.
- Ningún estado depende solo del color: agotado con texto, talla agotada tachada, rareza con rombos y texto, errores con ícono y mensaje.
- Tallas y colores con radios nativos: se navegan con flechas y los lectores de pantalla los anuncian.
- El carrito atrapa el foco mientras está abierto, se cierra con Esc y devuelve el foco al botón que lo abrió.
- Atajos: `/` buscar, `C` carrito, `Esc` cerrar, `←` `→` cambiar de escena en el héroe.
- Ventana redimensionable con mínimo de 1024 × 680.

## 8. Pantallas

Hechas: intro, inicio, catálogo (filtros por categoría, búsqueda y "cargar más"), detalle de producto y carrito.

Siguen: probador 3D, pago simulado (fase 6), estilista IA (fase 7) y panel de administración.
