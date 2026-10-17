# FlowStore · App de escritorio

Electron + React + Vite + TypeScript. Animaciones con `motion`. El sistema de diseño está descrito en [DESIGN.md](DESIGN.md).

## Requisitos

- Node 22.12 o superior
- El backend corriendo en `http://localhost:8080` (ver `../backend/README.md`). El catálogo, los precios y el stock salen de ahí. Si está apagado, la app muestra "Sin conexión con la tienda" con un botón para reintentar.
- Para usar otro servidor: `VITE_API_URL=http://otra-direccion:8080 npm run dev`

## Correr

```bash
cd desktop
npm install
npm run dev
```

`npm run dev` levanta Vite en el puerto 5173 y abre la ventana de Electron con **la tienda**. La primera vez descarga el ejecutable de Electron (~100 MB).

El styleguide se abre con `FLOWSTORE_START_PAGE=styleguide.html npm run dev`, o en el navegador con `npm run dev:web` y http://localhost:5173/styleguide.html.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite + ventana de Electron con recarga en caliente |
| `npm run dev:web` | Solo Vite: la tienda en http://localhost:5173 y el styleguide en /styleguide.html |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run build` | Revisa tipos y compila a `dist/` |
| `npm start` | Abre Electron con lo compilado en `dist/` |

## Estructura

```
desktop/
├── electron/            proceso principal de Electron (ventana, seguridad, lanzador)
├── src/
│   ├── api/             cliente HTTP y endpoints del catálogo
│   ├── app/             armazón: rutas (#/catalog, #/product/<id>), encabezado, pie, atajos
│   ├── assets/fonts/    fuentes libres (OFL) con sus licencias
│   ├── cart/            estado del carrito y panel lateral
│   ├── components/      componentes reutilizables, cada uno con su .module.css
│   │   └── garment/     dibujo de las 17 prendas por capas
│   ├── hooks/           carga de datos, foco, scroll
│   ├── i18n/es.ts       todos los textos visibles, en español
│   ├── lib/             contraste, dinero en COP, rareza, tallas, tipo de prenda
│   ├── pages/           inicio, catálogo, detalle de producto
│   ├── styles/          tokens.css, fuentes y estilos base
│   ├── styleguide/      página de revisión de componentes
│   ├── brand.ts         nombre de la marca y candidatos
│   └── main.tsx         entrada de la app
├── index.html           tienda
└── styleguide.html      styleguide
```

## Pantallas

| Ruta | Pantalla |
|---|---|
| (al abrir) | Intro con la tarjeta OFFGRID y el globo girando. Enter o Esc para entrar. Sale una vez por sesión. |
| `#/` | Inicio: héroe con 3 escenas, nuevos lanzamientos, categorías y bloque de edición limitada |
| `#/catalog` | Catálogo con filtro por categoría (`?category=`), búsqueda (`?search=`) y "cargar más" |
| `#/product/<id>` | Detalle: color, talla, stock, lupa y "agregar al carrito" |
| `#/login` y `#/register` | Iniciar sesión y crear cuenta. Después vuelven a la pantalla de donde venías (`?next=`). |
| `#/account` | Mi cuenta: medidas para el avatar y la talla, y cerrar sesión |
| Panel lateral | Carrito (tecla `C`) |

### Cuentas de prueba (perfil `dev`)

| Rol | Correo | Contraseña |
|---|---|---|
| Cliente | `cliente@flowstore.app` | `Cliente123!` |
| Administrador | `admin@flowstore.app` | `Admin123!` |

Solo existen en la base de desarrollo: las crea la migración `V900` del backend.

## Seguridad de la ventana

- `contextIsolation` activado, `nodeIntegration` desactivado y `sandbox` activado: el código de la interfaz no tiene acceso a Node.
- La ventana no puede navegar fuera de la app, y los enlaces externos se abren en el navegador del sistema.
- En producción la página lleva una política CSP que solo permite scripts propios y conexiones al backend.

`electron/launch.cjs` borra la variable `ELECTRON_RUN_AS_NODE` antes de abrir Electron. Algunos editores la exportan, y con ella Electron arranca como Node y no abre la ventana.
