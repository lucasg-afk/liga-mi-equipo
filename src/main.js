// Arranque: carga los datos, maneja la navegación y vuelve a dibujar.
import { construir, calcular } from './model.js';
import { chances } from './chances.js';
import * as V from './ui.js';

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

const ctx = { base: null, estado: null, yo: leer('eq') || null, sim: {}, manual: {} };
let tab = 'mi', fechaCargar = 0, fechaSim = 0, datos = null;

try { ctx.manual = JSON.parse(leer('manual') || '{}'); } catch { ctx.manual = {}; }

const TABS = [
  ['mi', 'Mi equipo'], ['A', 'Zona A'], ['B', 'Zona B'], ['an', 'Anual'], ['pr', 'Promedios'],
  ['si', 'Simular'], ['pb', 'Chances'], ['cr', 'Cruces'], ['fo', 'Formato'], ['ca', 'Cargar'],
];

const $ = (id) => document.getElementById(id);

async function cargarDatos() {
  const [equipos, fixture, resultados] = await Promise.all(
    ['data/equipos.json', 'data/fixture.json', 'data/resultados.json']
      .map((u) => fetch(u, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`No se pudo leer ${u} (${r.status})`);
        return r.json();
      }))
  );
  datos = { equipos, fixture, resultados };
  ctx.base = construir(equipos, fixture);
  recalcular();
}

function recalcular() {
  ctx.estado = calcular(ctx.base, { ...datos.resultados.partidos, ...ctx.manual });
}

// Cachea las simulaciones: son caras y el estado cambia poco.
let cacheChances = null;
function chancesDe(fijos) {
  const clave = JSON.stringify(fijos) + '|' + ctx.estado.pendientes.length + '|' + Object.keys(ctx.manual).length;
  if (!cacheChances || cacheChances.clave !== clave) {
    cacheChances = { clave, valor: chances(ctx.base, ctx.estado, fijos, 2000) };
  }
  return cacheChances.valor;
}

function piel() {
  const raiz = document.documentElement, meta = document.querySelector('meta[name=theme-color]');
  const col = ctx.yo && ctx.estado.equipos[ctx.yo].colores;
  if (!col) {
    document.body.classList.remove('sk');
    ['--tm', '--tm2', '--ontm'].forEach((k) => raiz.style.removeProperty(k));
    if (meta) meta.content = '#f2f5f7';
    return;
  }
  const n = parseInt(col[0].slice(1), 16);
  const luz = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  raiz.style.setProperty('--tm', col[0]);
  raiz.style.setProperty('--tm2', col[1]);
  raiz.style.setProperty('--ontm', luz > 0.55 ? '#12202b' : '#ffffff');
  document.body.classList.add('sk');
  if (meta) meta.content = col[0];
}

function dibujar() {
  const E = ctx.estado;
  piel();

  const faltan = E.enJuego ? ` (en juego: faltan ${E.enJuego} partido${E.enJuego > 1 ? 's' : ''} de esa fecha)` : '';
  const atras = E.atrasados ? `, con ${E.atrasados} pendiente${E.atrasados > 1 ? 's' : ''} o postergado${E.atrasados > 1 ? 's' : ''} de fechas anteriores` : '';
  $('sub').textContent = `Clausura tras la fecha ${E.ultimaFecha}${faltan}${atras}.`;

  $('nav').innerHTML = TABS.map(([k, t]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${t}</button>`).join('');

  const fechas = [...new Set(E.pendientes.map((m) => m.fecha))].sort((a, b) => a - b);
  if (!fechas.includes(fechaCargar)) fechaCargar = fechas[0] ?? 0;
  if (!fechas.includes(fechaSim)) fechaSim = fechas[0] ?? 0;
  for (const id of Object.keys(ctx.sim)) if (!E.pendientes.some((m) => m.id === id)) delete ctx.sim[id];

  let html;
  if (tab === 'mi') html = V.miEquipo(ctx);
  else if (tab === 'A' || tab === 'B') html = V.zona(ctx, tab);
  else if (tab === 'an') html = V.anual(ctx);
  else if (tab === 'pr') html = V.promedios(ctx);
  else if (tab === 'cr') html = V.tablaCruces(ctx);
  else if (tab === 'fo') html = V.formato();
  else if (tab === 'pb') html = V.vistaChances(ctx, chancesDe({}));
  else if (tab === 'si') html = V.vistaSimular(ctx, chancesDe(ctx.sim), fechaSim);
  else html = V.vistaCargar(ctx, fechaCargar);
  $('v').innerHTML = html;

  $('pie').textContent = `Datos actualizados al ${datos.resultados.actualizado}. Los empates en puntos se definen por diferencia de gol.`;
}

// --- eventos ---
const sel = $('eq');
$('nav').addEventListener('click', (e) => {
  const t = e.target.closest('button[data-t]');
  if (t) { tab = t.dataset.t; dibujar(); }
});

$('v').addEventListener('change', (e) => {
  if (e.target.id === 'cf') { fechaCargar = +e.target.value; dibujar(); }
  if (e.target.id === 'sfx') { fechaSim = +e.target.value; dibujar(); }
});

$('v').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;

  const fila = b.closest('[data-sim]');
  if (fila && b.dataset.o) {
    const id = fila.dataset.sim;
    if (ctx.sim[id] === b.dataset.o) delete ctx.sim[id]; else ctx.sim[id] = b.dataset.o;
    dibujar(); return;
  }
  if (b.id === 'sc') { ctx.sim = {}; dibujar(); return; }
  if (b.id === 'sw') {
    for (const m of ctx.estado.pendientes) {
      if (m.local === ctx.yo) ctx.sim[m.id] = 'L';
      else if (m.visita === ctx.yo) ctx.sim[m.id] = 'V';
    }
    dibujar(); return;
  }

  if (b.classList.contains('bo')) {
    delete ctx.manual[b.dataset.id];
    guardar('manual', JSON.stringify(ctx.manual));
    recalcular(); dibujar(); return;
  }
  if (b.classList.contains('sv')) {
    const fila2 = b.closest('[data-id]');
    const ga = fila2.querySelector('.ga').value, gb = fila2.querySelector('.gb').value;
    if (ga === '' || gb === '') return;
    ctx.manual[fila2.dataset.id] = { ga: +ga, gb: +gb };
    guardar('manual', JSON.stringify(ctx.manual));
    recalcular(); dibujar();
  }
});

cargarDatos().then(() => {
  const nombres = Object.keys(ctx.estado.equipos)
    .sort((a, b) => ctx.estado.equipos[a].nombre.localeCompare(ctx.estado.equipos[b].nombre, 'es'));
  sel.innerHTML = '<option value="">Elegí tu equipo</option>' +
    nombres.map((c) => `<option value="${c}"${c === ctx.yo ? ' selected' : ''}>${ctx.estado.equipos[c].nombre}</option>`).join('');
  sel.addEventListener('change', () => { ctx.yo = sel.value || null; guardar('eq', ctx.yo || ''); dibujar(); });
  dibujar();
}).catch((err) => {
  $('sub').textContent = 'No se pudieron cargar los datos.';
  $('v').innerHTML = `<div class="card"><p class="no">${err.message}</p><p class="h">Si abriste el archivo haciendo doble clic, el navegador bloquea la lectura de los datos. Serví la carpeta con <code>npx serve</code> o abrila desde GitHub Pages.</p></div>`;
});
