# NoVibeJustCode

Plataforma educativa social con Angular, Node.js, Express, Socket.IO y MySQL. Incluye cursos de programación, comunidad, mensajería, proyectos y suscripciones Pro.

## Funciones

- Registro, acceso, perfiles y edición de imágenes.
- Cursos, lecciones, progreso y ejercicios.
- Comunidad, amistades y chat en tiempo real.
- Editor y proyectos con archivos descargables.
- Plan gratuito y suscripción Pro mediante PayPal.
- Exportación de datos y eliminación de cuenta.

## Requisitos

- Node.js 22.12 o posterior y npm.
- MySQL 8 o posterior.

## Inicio local

1. Instala las dependencias desde la raíz del proyecto:

   ```sh
   npm install
   ```

2. Copia `.env.example` como `.env` en la raíz del proyecto.
3. En `.env`, configura `DATABASE_URL` con este formato: `mysql://usuario:clave@127.0.0.1:3306/novibejustcode`. Configura también `JWT_SECRET` con al menos 40 caracteres aleatorios.
4. Crea la base de datos `novibejustcode` y un usuario con permisos en MySQL.
5. Inicializa las tablas y el contenido de cursos:

   ```sh
   npm run db:init
   ```

6. Inicia el backend y el frontend juntos:

   ```sh
   npm run dev
   ```

Abre <http://localhost:4200>. Angular reenvía `/api`, `/uploads` y `/socket.io` a la API local en el puerto 3000.

Para compilar el frontend:

```sh
npm run build
```

## Servicios externos opcionales

### Fotos y banners persistentes en Railway

Las imágenes admiten JPEG, PNG y WebP de hasta 10 MB por archivo. El backend valida y convierte la imagen a WebP antes de guardarla. En Railway se utiliza un bucket privado S3; las imágenes se sirven desde `/uploads/:nombre` sin exponer credenciales al navegador.

Configura estas variables en el servicio de la aplicación usando las referencias al bucket existente:

```text
S3_ENDPOINT=${{wrapped-chest.ENDPOINT}}
S3_BUCKET=${{wrapped-chest.BUCKET}}
S3_REGION=${{wrapped-chest.REGION}}
S3_ACCESS_KEY_ID=${{wrapped-chest.ACCESS_KEY_ID}}
S3_SECRET_ACCESS_KEY=${{wrapped-chest.SECRET_ACCESS_KEY}}
S3_FORCE_PATH_STYLE=false
```

Las imágenes anteriores que todavía estén en `UPLOAD_DIR` se copian al bucket al consultarlas, conservando sus direcciones. Los archivos ya perdidos antes de esta configuración deben volver a subirse. Para desarrollo local, sin `S3_BUCKET`, se utiliza `UPLOAD_DIR`.

Pruebas de imágenes: `node --test backend/test/profile-images.test.mjs`.

La ejecución de prácticas de consola usa Judge0. Configura `JUDGE0_URL` y, si tu instancia lo requiere, `JUDGE0_KEY`, `JUDGE0_AUTH_HEADER`, `JUDGE0_HOST`, `JUDGE0_PYTHON_ID` y `JUDGE0_NODE_ID`.

La validación de TypeScript y proyectos web requiere un servicio de evaluación independiente. Configura su dirección en `WORKER_URL` y comparte el mismo secreto en `WORKER_SECRET` en ambos servicios.

Para activar pagos Pro, configura `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_ID` y `PAYPAL_WEBHOOK_ID`. El endpoint de notificaciones es `/api/notificaciones/paypal`. `PAYPAL_API` usa el entorno comercial por defecto.

Sin configurar estos proveedores, las demás funciones de la aplicación pueden ejecutarse localmente; las operaciones que dependen de ellos no estarán disponibles.

## Estructura del proyecto

- `frontend/src/main.ts`: entrada de Angular.
- `frontend/src/app/components/`: componentes organizados por página o función; cada uno mantiene sus archivos TypeScript, HTML y CSS, y su servicio cuando lo necesita.
- `frontend/src/app/components/navbar/` y `footer/`: navegación y pie de página.
- `frontend/src/app/services/`: servicio API e interceptor compartidos.
- `frontend/src/app/guards/`: protección de rutas.
- `backend/src/app.js`: configuración de Express, rutas, middleware, Socket.IO y arranque de la API.
- `backend/src/config/`: configuración de entorno y conexión MySQL.
- `backend/src/modules/`: módulos de cuentas, aprendizaje, comunidad, mensajes, privacidad, proyectos y suscripciones.
- `backend/src/adapters/`: integración con Judge0, el servicio de evaluación y PayPal.
- `database/schema.sql`: estructura de la base de datos.
- `database/curriculum.json`: catálogo y contenido de cursos.

## Comandos

| Comando          | Acción                                               |
| ---------------- | ---------------------------------------------------- |
| `npm run dev`    | Inicia la API y el frontend para desarrollo local.   |
| `npm run db:init`| Crea las tablas e importa el contenido inicial.     |
| `npm run build`  | Compila el frontend para producción.                |
