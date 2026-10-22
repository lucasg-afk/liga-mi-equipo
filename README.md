# Liga Argentina 2026: mi equipo

Elegís tu equipo y la app te muestra, desde su punto de vista, el Clausura 2026 de la Liga Profesional: posición en la zona, cruces de octavos, tabla anual, promedios, qué resultados ajenos te convienen y las chances de clasificar o descender.

Es una página estática: HTML, CSS y JavaScript sin dependencias ni paso de build. Se abre sirviendo la carpeta.

## Arrancar

```bash
npm run dev     # sirve la carpeta en http://localhost:5173
npm test        # corre los tests de la lógica
```

Abrir `index.html` con doble clic no funciona: el navegador bloquea la lectura de los JSON desde `file://`.

## Cómo está armado

| Archivo | Qué hace |
| --- | --- |
| `data/equipos.json` | Base de cada equipo **antes** de los partidos: puntos del Clausura y de la anual, diferencia de gol, puntos y partidos para el promedio. |
| `data/fixture.json` | Los partidos de cada fecha. El id de un partido es `f<fecha>_<LOCAL>-<VISITANTE>`. |
| `data/resultados.json` | Los resultados jugados. Es el único archivo que cambia fecha a fecha. |
| `src/model.js` | Cálculo de tablas, promedios, cruces y conveniencias. Puro, sin DOM. |
| `src/chances.js` | Simulación de lo que falta del torneo (Monte Carlo). |
| `src/ui.js` | Las vistas. Devuelven HTML. |
| `src/main.js` | Carga los datos, navegación, skin del equipo elegido. |
| `scripts/actualizar.mjs` | Suma resultados nuevos a `data/resultados.json`, validando contra el fixture. |
| `test/model.test.js` | Verifica la tabla contra las posiciones reales tras la fecha 13. |

Los puntos de un equipo siempre son `base + resultados`. Si una tabla da mal, el error está en `data/`, no en la lógica.

## Actualizar una fecha

El script toma un JSON y lo mezcla en `data/resultados.json`:

```bash
echo '{"partidos":[{"id":"f14_ROS-HUR","ga":2,"gb":1}]}' | npm run actualizar
npm test
git commit -am "Fecha 14"
```

Un partido postergado va como `{"id":"f14_TAL-DYJ","post":true,"nota":"se juega el 5/11"}`. El script rechaza los ids que no están en el fixture y recalcula sola la última fecha completa.

Para que se actualice sin que hagas nada, ver [`docs/tarea-programada.md`](docs/tarea-programada.md).

## Publicar

El workflow `.github/workflows/pages.yml` corre los tests y publica en GitHub Pages con cada push a `main`. Hay que habilitarlo una vez: **Settings → Pages → Source: GitHub Actions**. La URL queda `https://<usuario>.github.io/<repo>/`.

Como trae `manifest.webmanifest`, desde el celular se puede agregar a la pantalla de inicio y abre sin barra del navegador.

## Qué falta

- Íconos para el manifest (hoy la lista está vacía, así que la app instalada usa el ícono genérico).
- Calibrar el modelo de chances contra los resultados reales a medida que avanza el torneo.
- Los cupos de Libertadores y Sudamericana son aproximados: dependen de quién gane cada torneo.

## Datos

Cargados a mano desde tablas públicas (Alargue, 365Scores, Promedios Info) al 22/10/2026, tras la fecha 13.
