# Que se actualice sola

La idea es que, después de cada fecha, una sesión de Claude Code busque los resultados, los cargue y haga commit. Vos no tocás nada.

## Armarla

En la pestaña **Code**, con este repo seleccionado, pedí que se cree una tarea programada con el prompt de abajo. Horario sugerido: **martes y jueves a las 10:00** (hora de Argentina), que es cuando ya terminaron el fin de semana largo de la fecha y los partidos corridos al lunes o martes.

Para que la tarea pueda hacer commit sola, en sus ajustes tiene que estar en aprobación automática.

## El prompt de la tarea

```
Actualizá los resultados del Torneo Clausura 2026 de la Liga Profesional argentina en este repositorio.

1. Leé data/fixture.json y data/resultados.json para saber qué partidos ya están cargados.
2. Buscá en la web los resultados de los partidos del fixture que todavía no estén en resultados.json
   y que ya se hayan jugado. Usá al menos dos fuentes y, si no coinciden, no cargues ese partido.
3. Si un partido fue postergado, cargalo como {"id": "...", "post": true, "nota": "<nueva fecha>"}.
4. Pasá los resultados por el script, que valida contra el fixture:
     echo '<json>' | node scripts/actualizar.mjs
5. Corré: node --test
   Si algún test falla, NO hagas commit: dejá el repo como estaba y explicá qué falló.
6. Si todo pasa y hubo cambios, hacé commit de data/resultados.json con el mensaje
   "Fecha <n>: <cantidad> resultados" y push a main.
7. Si no hubo partidos nuevos, no hagas commit y terminá diciendo que no había nada que cargar.

No cambies ningún otro archivo. Los puntos base de data/equipos.json no se tocan nunca:
la tabla sale de sumar los resultados a esa base.
```

## Si algo sale mal

El paso 5 es el seguro: los tests comparan la tabla calculada contra las posiciones reales tras la fecha 13, así que un dato mal cargado hace fallar el test antes de llegar al commit.

Cuando pase una fecha y los tests queden viejos (porque la tabla real ya avanzó), hay que actualizar los valores esperados en `test/model.test.js`. Es el momento de chequear a mano que la app coincide con la tabla oficial.
