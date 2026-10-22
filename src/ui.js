// Vistas. Cada una devuelve HTML a partir del estado ya calculado.
import { promedio, cruces, queMeConviene } from './model.js';

export const fmt = (n) => (n > 0 ? '+' + n : String(n));
export const pct = (v) => (v < 1 ? '<1' : v > 99 ? '>99' : Math.round(v)) + '%';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function zona(ctx, z) {
  const { estado: E, yo } = ctx;
  const lista = z === 'A' ? E.zonaA : E.zonaB;
  return '<div class="card t"><div class="r"><b></b><span></span><i>Dif</i><em>Pts</em></div>' +
    lista.map((c, i) =>
      (i === 8 ? '<div class="cut">Fuera de playoffs</div>' : '') +
      `<div class="r${c === yo ? ' me' : ''}${i < 8 ? ' in' : ''}"><b>${i + 1}</b><span>${esc(E.equipos[c].nombre)}</span><i>${fmt(E.equipos[c].dg)}</i><em>${E.equipos[c].pts}</em></div>`
    ).join('') + '</div>';
}

export function anual(ctx) {
  const { estado: E, yo } = ctx;
  const banda = { 3: 'Hasta acá, Libertadores', 9: 'Hasta acá, Sudamericana', 29: 'Descenso por tabla anual' };
  return '<div class="card t an"><div class="r"><b></b><span></span><i>Aper</i><i>Clau</i><i>Dif</i><em>Total</em></div>' +
    E.anual.map((c, i) => {
      const t = E.equipos[c];
      return (banda[i] ? `<div class="cut">${banda[i]}</div>` : '') +
        `<div class="r${c === yo ? ' me' : ''}"><b>${i + 1}</b><span>${esc(t.nombre)}</span><i>${t.anualPts - t.pts}</i><i>${t.pts}</i><i>${fmt(t.anualDG)}</i><em>${t.anualPts}</em></div>`;
    }).join('') +
    '</div><p class="foot">Los 3 primeros de la anual van a la Libertadores y del 4º al 9º a la Sudamericana. Los cupos pueden correrse según los campeones: Belgrano ya tiene el suyo por el Apertura.</p>';
}

export function promedios(ctx) {
  const { estado: E, yo } = ctx;
  return '<div class="card t an"><div class="r"><b></b><span></span><i>Pts</i><i>PJ</i><i></i><em>Prom</em></div>' +
    E.promedios.map((c, i) => {
      const t = E.equipos[c];
      return (i === 29 ? '<div class="cut">Descenso por promedios</div>' : '') +
        `<div class="r${c === yo ? ' me' : ''}"><b>${i + 1}</b><span>${esc(t.nombre)}</span><i>${t.promPts}</i><i>${t.promPJ}</i><i></i><em>${promedio(t).toFixed(3)}</em></div>`;
    }).join('') +
    '</div><p class="foot">Puntos de 2024, 2025 y 2026 divididos por los partidos jugados. Gimnasia (M) y Estudiantes (RC) empezaron de cero. Si el último de promedios es también el último de la anual, baja además el anteúltimo de la anual.</p>';
}

export function miEquipo(ctx) {
  const { estado: E, yo } = ctx;
  if (!yo) return '<p class="h">Elegí tu equipo arriba para ver tu situación, qué resultados te convienen y tus próximos partidos.</p>';
  const T = E.equipos, t = T[yo];
  const Z = t.zona === 'A' ? E.zonaA : E.zonaB;
  const O = t.zona === 'A' ? E.zonaB : E.zonaA;
  const i = Z.indexOf(yo), p = i + 1, dentro = i < 8;
  const brecha = dentro ? t.pts - T[Z[8]].pts : T[Z[7]].pts - t.pts;

  let s = `<div class="card"><h2>Clausura, Zona ${t.zona}</h2><div class="big">${p}º<small>${t.pts} pts</small></div>`;
  s += dentro
    ? `<p class="ok"><b>Dentro de los 8.</b> ${brecha ? `${brecha} pts sobre el 9º (${esc(T[Z[8]].nombre)}).` : 'Igualás en puntos al 9º; define la diferencia de gol.'}</p>`
    : `<p class="no"><b>Fuera de los 8.</b> ${brecha ? `Te faltan ${brecha} pts para el 8º (${esc(T[Z[7]].nombre)}).` : 'Igualás en puntos al 8º; define la diferencia de gol.'}</p>`;
  if (dentro) s += `<p>Si terminara hoy: octavos contra <b>${esc(T[O[7 - i]].nombre)}</b>.</p>`;
  const mios = E.pendientes.filter((m) => m.local === yo || m.visita === yo);
  s += `<p class="h">Hasta ${t.pts + 3 * mios.length} pts posibles con ${mios.length} partidos por jugar.</p></div>`;

  const q = E.anual.indexOf(yo) + 1;
  const dif = (k) => {
    const x = T[E.anual[k]].anualPts - t.anualPts;
    return x > 0 ? `a ${x} pts de ${esc(T[E.anual[k]].nombre)}` : `${-x} pts de ventaja sobre ${esc(T[E.anual[k]].nombre)}`;
  };
  const ultimo = T[E.anual[29]];
  s += `<div class="card"><h2>Tabla anual</h2><div class="big">${q}º<small>${t.anualPts} pts</small></div>` +
    `<p>Libertadores (3º): ${dif(2)}.</p><p>Sudamericana (9º): ${dif(8)}.</p>` +
    `<p>Descenso (30º): ${ultimo.anualPts - t.anualPts >= 0 ? 'sos el último o igualás al último' : `${t.anualPts - ultimo.anualPts} pts sobre ${esc(ultimo.nombre)}`}.</p></div>`;

  const pq = E.promedios.indexOf(yo) + 1, ultProm = T[E.promedios[29]];
  s += `<div class="card"><h2>Promedios</h2><div class="big">${pq}º<small>${promedio(t).toFixed(3)}</small></div>` +
    `<p>${pq === 30 ? 'Sos el último: descenderías por promedios.' : `Ventaja sobre el último (${esc(ultProm.nombre)}, ${promedio(ultProm).toFixed(3)}): ${(promedio(t) - promedio(ultProm)).toFixed(3)}.`}</p></div>`;

  s += '<div class="card"><h2>Tus partidos</h2>' + mios.map((m) => {
    const otro = m.local === yo ? m.visita : m.local;
    return `<div class="m"><span>Fecha ${m.fecha}</span><span>${m.local === yo ? 'vs' : 'en'} ${esc(T[otro].nombre)}${postergado(m)}</span></div>`;
  }).join('') + '<p class="own">Siempre conviene ganar.</p></div>';

  s += bloqueConviene('Qué te conviene: playoffs', 'Rivales de tu zona a ±4 pts.', queMeConviene(E, yo, 'clausura', 4));
  s += bloqueConviene('Qué te conviene: tabla anual', 'Equipos a ±5 pts en la general.', queMeConviene(E, yo, 'anual', 5));
  if (pq >= 21) s += bloqueConviene('Qué te conviene: promedios', 'Equipos a ±0,05 de promedio.', queMeConviene(E, yo, 'promedio', 0.05));
  return s;
}

const bloqueConviene = (titulo, nota, grupos) =>
  `<div class="card"><h2>${titulo}</h2><p class="h">${nota}</p>` +
  (grupos.length
    ? grupos.map((g) => `<div class="fc"><b>Fecha ${g.fecha}</b>${g.frases.map((f) => `<div>${esc(f)}</div>`).join('')}</div>`).join('')
    : '<p class="h">No hay rivales directos cerca.</p>') + '</div>';

export const postergado = (m) => (m.post ? ' (postergado' + (m.nota ? ': ' + esc(m.nota) : '') + ')' : '');

export function tablaCruces(ctx) {
  const { estado: E, yo } = ctx;
  return '<div class="card">' + cruces(E).map((c, i) =>
    `<div class="m${c.local === yo || c.visita === yo ? ' me' : ''}"><span>${i + 1}º ${E.equipos[c.local].zona}: ${esc(E.equipos[c.local].nombre)}</span><span>${8 - i}º ${E.equipos[c.visita].zona}: ${esc(E.equipos[c.visita].nombre)}</span></div>`
  ).join('') + '</div><p class="foot">Octavos si terminara hoy: 1º de una zona contra 8º de la otra, 2º contra 7º y así. Partido único, local el mejor ubicado.</p>';
}

export const formato = () => `<div class="card"><ul>
<li>Apertura: campeón Belgrano. Juega el Trofeo de Campeones contra el campeón del Clausura.</li>
<li>Clausura: 30 equipos en 2 zonas de 15, 16 fechas. Los 8 mejores de cada zona pasan a octavos, a partido único.</li>
<li>Final: sábado 12 de diciembre en La Plata.</li>
<li>El campeón del Clausura va directo a la Libertadores 2027. El 1º de la tabla anual es Campeón de Liga.</li>
<li>La tabla anual suma los puntos de la fase regular de Apertura y Clausura y reparte los cupos de Libertadores y Sudamericana.</li>
<li>Descienden 2: el último de la anual y el último de promedios. Si es el mismo, baja también el anteúltimo de la anual.</li></ul></div>`;

export const barras = (r) => [
  ['Playoffs', 'playoffs'], ['Libertadores (top 3 anual)', 'libertadores'],
  ['Sudamericana (puestos 4 a 9)', 'sudamericana'], ['Descenso', 'descenso'],
].map(([n, k]) => `<div class="pb"><span>${n}</span><div class="bar"><i style="width:${Math.max(r[k], 1)}%"></i></div><b>${pct(r[k])}</b></div>`).join('');

export function vistaChances(ctx, r) {
  const { estado: E, yo } = ctx;
  let s = yo ? `<div class="card"><h2>Chances de ${esc(E.equipos[yo].nombre)}</h2>${barras(r[yo])}</div>` : '';
  const orden = Object.keys(E.equipos).sort((x, y) => r[y].playoffs - r[x].playoffs || r[y].libertadores - r[x].libertadores);
  return s + '<div class="card t pc"><div class="r"><span></span><i>Playoffs</i><i>Libert.</i><i>Descenso</i></div>' +
    orden.map((c) => `<div class="r${c === yo ? ' me' : ''}"><span>${esc(E.equipos[c].nombre)}</span><i>${pct(r[c].playoffs)}</i><i>${pct(r[c].libertadores)}</i><i>${pct(r[c].descenso)}</i></div>`).join('') +
    '</div><p class="foot">Son estimaciones: 2.000 simulaciones de lo que falta, con un modelo simple basado en el rendimiento del año y la ventaja de local. Libertadores y Sudamericana son aproximadas porque los cupos dependen de los campeones.</p>';
}

export function vistaSimular(ctx, r, fechaSel) {
  const { estado: E, yo, sim } = ctx;
  if (!yo) return '<p class="h">Elegí tu equipo arriba para simular.</p>';
  const fechas = [...new Set(E.pendientes.map((m) => m.fecha))].sort((a, b) => a - b);
  if (!fechas.length) return '<p class="h">No quedan partidos por jugar.</p>';
  const n = Object.keys(sim).length;
  return `<div class="card"><h2>Tus chances</h2><p class="h">${n ? `Con ${n} resultado${n > 1 ? 's' : ''} elegido${n > 1 ? 's' : ''}; el resto se sortea.` : 'Todavía no elegiste resultados.'}</p>${barras(r[yo])}</div>` +
    '<div class="card"><h2>Elegí resultados</h2><div class="ld"><button id="sw">Ganar todos mis partidos</button><button id="sc">Limpiar</button></div>' +
    `<select id="sfx" aria-label="Fecha">${fechas.map((f) => `<option value="${f}"${f === fechaSel ? ' selected' : ''}>Fecha ${f}</option>`).join('')}</select>` +
    E.pendientes.filter((m) => m.fecha === fechaSel).map((m) =>
      `<div class="fc sm" data-sim="${m.id}"><div>${esc(E.equipos[m.local].nombre)} vs ${esc(E.equipos[m.visita].nombre)}${postergado(m)}</div><div class="ld">` +
      [['L', E.equipos[m.local].nombre], ['E', 'Empate'], ['V', E.equipos[m.visita].nombre]]
        .map(([o, txt]) => `<button data-o="${o}" class="${sim[m.id] === o ? 'on' : ''}">${esc(txt)}</button>`).join('') +
      '</div></div>'
    ).join('') +
    '</div><p class="foot">Lo que elegís acá no se guarda. Para los desempates se sortea un margen de gol.</p>';
}

export function vistaCargar(ctx, fechaSel) {
  const { estado: E, manual } = ctx;
  const fechas = [...new Set(E.pendientes.map((m) => m.fecha))].sort((a, b) => a - b);
  let h = '<p class="h">Los resultados se actualizan solos en el repositorio. Si querés adelantarte a un partido que ya se jugó, cargalo acá: queda guardado solo en este teléfono.</p>';
  if (fechas.length) {
    h += `<div class="card"><select id="cf" aria-label="Fecha">${fechas.map((f) => `<option value="${f}"${f === fechaSel ? ' selected' : ''}>Fecha ${f}</option>`).join('')}</select>` +
      E.pendientes.filter((m) => m.fecha === fechaSel).map((m) =>
        `<div class="fc" data-id="${m.id}"><div>${esc(E.equipos[m.local].nombre)} vs ${esc(E.equipos[m.visita].nombre)}${postergado(m)}</div>` +
        '<div class="ld"><input class="ga" type="number" min="0" inputmode="numeric" aria-label="Goles local"><input class="gb" type="number" min="0" inputmode="numeric" aria-label="Goles visitante"><button class="sv">Guardar</button></div></div>'
      ).join('') + '</div>';
  } else h += '<p class="h">No quedan partidos pendientes.</p>';

  const cargados = Object.keys(manual);
  if (cargados.length) {
    h += '<div class="card"><h2>Cargados en este teléfono</h2>' + cargados.map((id) => {
      const r = manual[id], [, par] = id.split('_'), [l, v] = par.split('-');
      return `<div class="m"><span>${esc(E.equipos[l].nombre)} ${r.ga}-${r.gb} ${esc(E.equipos[v].nombre)}</span><button class="bo" data-id="${id}">Borrar</button></div>`;
    }).join('') + '</div>';
  }
  return h;
}
