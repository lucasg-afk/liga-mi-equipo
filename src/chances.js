// Estimación de chances: simula muchas veces lo que falta del torneo.
import { promedio } from './model.js';

const sigmoide = (x) => 1 / (1 + Math.exp(-x));

/** Generador reproducible, para que los tests no dependan del azar. */
export function rngSemilla(semilla = 1) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * @param base       salida de construir()
 * @param estado     salida de calcular()
 * @param fijos      { idPartido: 'L' | 'E' | 'V' } resultados que el usuario fija
 * @param n          cantidad de simulaciones
 * @returns { [code]: { playoffs, libertadores, sudamericana, descenso } } en %
 */
export function chances(base, estado, fijos = {}, n = 2000, rng = Math.random) {
  const T = estado.equipos;
  const codes = Object.keys(T);
  const ix = {};
  codes.forEach((c, i) => (ix[c] = i));

  // Fuerza: rendimiento del año, suavizado para que nadie quede en 0 o en 1.
  const fuerza = codes.map((c) => {
    const pj2026 = T[c].promPJ - base.equipos[c].promPJPrevios;
    return (T[c].anualPts + 6.75) / (pj2026 + 5);
  });

  const zonas = { A: [], B: [] };
  codes.forEach((c, i) => zonas[T[c].zona].push(i));

  // Probabilidad de local / empate / visitante para cada partido pendiente.
  const partidos = estado.pendientes.map((m) => {
    const h = ix[m.local], v = ix[m.visita];
    const x = 0.9 * (fuerza[h] - fuerza[v]) + 0.35; // 0.35 = ventaja de local
    const pL = sigmoide(x - 0.55);
    const pNoV = sigmoide(x + 0.55);
    return { h, v, pL, pLE: pL + (1 - pL - (1 - pNoV)), fijo: fijos[m.id] };
  });

  const base_ = {
    pts: codes.map((c) => T[c].pts),
    dg: codes.map((c) => T[c].dg),
    anualPts: codes.map((c) => T[c].anualPts),
    anualDG: codes.map((c) => T[c].anualDG),
    promPts: codes.map((c) => T[c].promPts),
    promPJ: codes.map((c) => T[c].promPJ),
  };
  const cuenta = codes.map(() => [0, 0, 0, 0]);
  const todos = codes.map((_, i) => i);

  for (let k = 0; k < n; k++) {
    const pts = base_.pts.slice(), dg = base_.dg.slice();
    const aPts = base_.anualPts.slice(), aDG = base_.anualDG.slice();
    const pPts = base_.promPts.slice(), pPJ = base_.promPJ.slice();

    for (const p of partidos) {
      let o = p.fijo;
      if (!o) { const r = rng(); o = r < p.pL ? 'L' : r < p.pLE ? 'E' : 'V'; }
      pPJ[p.h]++; pPJ[p.v]++;
      if (o === 'E') {
        pts[p.h]++; pts[p.v]++; aPts[p.h]++; aPts[p.v]++; pPts[p.h]++; pPts[p.v]++;
      } else {
        const margen = 1 + (rng() < 0.4 ? 1 : 0) + (rng() < 0.15 ? 1 : 0);
        const G = o === 'L' ? p.h : p.v, P = o === 'L' ? p.v : p.h;
        pts[G] += 3; aPts[G] += 3; pPts[G] += 3;
        dg[G] += margen; dg[P] -= margen;
        aDG[G] += margen; aDG[P] -= margen;
      }
    }

    for (const z of ['A', 'B']) {
      zonas[z].slice().sort((x, y) => pts[y] - pts[x] || dg[y] - dg[x]).slice(0, 8)
        .forEach((i) => cuenta[i][0]++);
    }
    const ordAnual = todos.slice().sort((x, y) => aPts[y] - aPts[x] || aDG[y] - aDG[x]);
    ordAnual.slice(0, 3).forEach((i) => cuenta[i][1]++);
    ordAnual.slice(3, 9).forEach((i) => cuenta[i][2]++);

    const ordProm = todos.slice().sort((x, y) => pPts[y] / pPJ[y] - pPts[x] / pPJ[x]);
    const bajan = new Set([ordProm[29], ordAnual[29]]);
    if (ordProm[29] === ordAnual[29]) bajan.add(ordAnual[28]);
    bajan.forEach((i) => cuenta[i][3]++);
  }

  const out = {};
  codes.forEach((c, i) => {
    const [a, b, d, e] = cuenta[i].map((x) => (100 * x) / n);
    out[c] = { playoffs: a, libertadores: b, sudamericana: d, descenso: e };
  });
  return out;
}

export { promedio };
