// Cálculo de tablas. Sin DOM: se puede correr en Node y testear.

/** Arma la estructura base a partir de data/equipos.json y data/fixture.json. */
export function construir(equiposJson, fixtureJson) {
  const equipos = {};
  for (const e of equiposJson.equipos) equipos[e.code] = { ...e };

  const partidos = [];
  for (const [fecha, linea] of Object.entries(fixtureJson.fechas)) {
    for (const par of linea.trim().split(/\s+/)) {
      const [local, visita] = par.split('-');
      if (!equipos[local] || !equipos[visita]) {
        throw new Error(`Fixture fecha ${fecha}: equipo desconocido en "${par}"`);
      }
      partidos.push({ id: `f${fecha}_${par}`, fecha: Number(fecha), local, visita });
    }
  }
  return { equipos, partidos };
}

const jugado = (r) => !!r && Number.isInteger(r.ga) && Number.isInteger(r.gb);

/**
 * Aplica los resultados sobre la base y devuelve todas las tablas.
 * @param {ReturnType<construir>} base
 * @param {Record<string, {ga?:number, gb?:number, post?:boolean, nota?:string}>} resultados
 */
export function calcular(base, resultados = {}) {
  const T = {};
  for (const [code, e] of Object.entries(base.equipos)) {
    T[code] = {
      code,
      nombre: e.nombre,
      zona: e.zona,
      colores: e.colores,
      pts: e.clausuraPts,
      dg: e.clausuraDG,
      anualPts: e.anualPts,
      anualDG: e.anualDG,
      promPts: e.promPtsPrevios + e.anualPts,
      promPJ: e.promPJPrevios + e.pj2026,
    };
  }

  const pendientes = [];
  for (const m of base.partidos) {
    const r = resultados[m.id];
    if (!jugado(r)) {
      pendientes.push({ ...m, post: !!(r && r.post), nota: (r && r.nota) || '' });
      continue;
    }
    const ptsL = r.ga > r.gb ? 3 : r.ga === r.gb ? 1 : 0;
    const ptsV = r.gb > r.ga ? 3 : r.ga === r.gb ? 1 : 0;
    const L = T[m.local], V = T[m.visita];
    L.pts += ptsL; V.pts += ptsV;
    L.anualPts += ptsL; V.anualPts += ptsV;
    L.promPts += ptsL; V.promPts += ptsV;
    L.promPJ++; V.promPJ++;
    const diff = r.ga - r.gb;
    L.dg += diff; V.dg -= diff;
    L.anualDG += diff; V.anualDG -= diff;
  }

  const codes = Object.keys(T);
  const zona = (z) => codes.filter((c) => T[c].zona === z)
    .sort((x, y) => T[y].pts - T[x].pts || T[y].dg - T[x].dg || T[x].nombre.localeCompare(T[y].nombre, 'es'));
  const anual = codes.slice()
    .sort((x, y) => T[y].anualPts - T[x].anualPts || T[y].anualDG - T[x].anualDG || T[x].nombre.localeCompare(T[y].nombre, 'es'));
  const promedios = codes.slice().sort((x, y) => promedio(T[y]) - promedio(T[x]));

  const jugadas = base.partidos.filter((m) => jugado(resultados[m.id])).map((m) => m.fecha);
  const ultimaFecha = jugadas.length ? Math.max(...jugadas) : 0;
  const enJuego = pendientes.filter((m) => m.fecha === ultimaFecha && !m.post).length;
  const atrasados = pendientes.filter((m) => m.fecha < ultimaFecha || (m.post && m.fecha <= ultimaFecha)).length;

  return { equipos: T, zonaA: zona('A'), zonaB: zona('B'), anual, promedios, pendientes, ultimaFecha, enJuego, atrasados };
}

export const promedio = (e) => (e.promPJ ? e.promPts / e.promPJ : 0);

/** Octavos si el torneo terminara hoy: 1ºA-8ºB, 2ºA-7ºB, etc. */
export function cruces(estado) {
  const A = estado.zonaA.slice(0, 8), B = estado.zonaB.slice(0, 8);
  return A.map((a, i) => ({ local: a, visita: B[7 - i], llave: i + 1 }));
}

const VALOR = {
  clausura: (T, c) => T[c].pts,
  anual: (T, c) => T[c].anualPts,
  promedio: (T, c) => promedio(T[c]),
};

/**
 * Qué resultados de los partidos pendientes le convienen a `code`:
 * busca rivales directos a `margen` de distancia en la tabla elegida.
 * Devuelve [{fecha, frases:[...]}] agrupado por fecha.
 */
export function queMeConviene(estado, code, tabla = 'clausura', margen = 4) {
  const T = estado.equipos, valor = VALOR[tabla];
  const mio = valor(T, code), zona = T[code].zona;
  const esRival = (x) => x !== code
    && Math.abs(valor(T, x) - mio) <= margen
    && (tabla !== 'clausura' || T[x].zona === zona);

  const porFecha = new Map();
  for (const m of estado.pendientes) {
    if (m.local === code || m.visita === code) continue;
    const rl = esRival(m.local), rv = esRival(m.visita);
    let frase = '';
    if (rl && rv) frase = `Empate entre ${T[m.local].nombre} y ${T[m.visita].nombre}`;
    else if (rl) frase = `${T[m.local].nombre} pierda ante ${T[m.visita].nombre}`;
    else if (rv) frase = `${T[m.visita].nombre} pierda ante ${T[m.local].nombre}`;
    if (!frase) continue;
    if (!porFecha.has(m.fecha)) porFecha.set(m.fecha, []);
    porFecha.get(m.fecha).push(frase);
  }
  return [...porFecha.entries()].sort((a, b) => a[0] - b[0]).map(([fecha, frases]) => ({ fecha, frases }));
}
