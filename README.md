# Ludoteca

Nuestra colección de juegos de mesa al estilo Pokédex. Sitio estático (HTML, CSS y JS sin dependencias) desplegado en Cloudflare Workers.

## Estructura

- `public/index.html`: página única.
- `public/data/juegos.json`: **todos los datos de los juegos**. Para agregar o corregir un juego, edita este archivo.
- `public/img/fotos/`: fotos propias de las cajas.
- `wrangler.jsonc`: configuración de Cloudflare.

## Agregar un juego

Copia una entrada en `juegos.json`, cambia `id` (número siguiente), `slug` (único, sin espacios) y el resto de campos. Para usar una foto propia, ponla en `public/img/fotos/` y apunta `imagen` (y opcionalmente `fotos`) a ella.

## Probar en local

```bash
python -m http.server 8788 --directory public
```

## Desplegar en Cloudflare

```bash
npx wrangler login
```

```bash
npx wrangler deploy
```

El sitio queda en `https://ludoteca.<tu-subdominio>.workers.dev`. Se le puede asignar un dominio propio desde el panel de Cloudflare.
