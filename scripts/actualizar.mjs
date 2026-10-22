#!/usr/bin/env node
// Suma resultados nuevos a data/resultados.json, validando contra el fixture.
//
//   node scripts/actualizar.mjs nuevos.json
//   cat nuevos.json | node scripts/actualizar.mjs
//
// Formato de entrada (lo mismo que devuelve la tarea programada):
//   { "partidos": [ { "id": "f14_ROS-HUR", "ga": 2, "gb": 1 },
//                   { "id": "f14_TAL-DYJ", "post": true, "nota": "se juega el 5/11" } ] }

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaFixture = join(raiz, 'data/fixture.json');
const rutaResultados = join(raiz, 'data/resultados.json');

const leerJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

function entrada() {
  const arg = process.argv[2];
  const texto = arg ? readFileSync(arg, 'utf8') : readFileSync(0, 'utf8');
  const limpio = texto.replace(/```json|```/g, '').trim();
  if (!limpio) throw new Error('No llegó nada por entrada.');
  return JSON.parse(limpio);
}

const fixture = leerJSON(rutaFixture);
const validos = new Set();
for (const [fecha, linea] of Object.entries(fixture.fechas)) {
  for (const par of linea.trim().split(/\s+/)) validos.add(`f${fecha}_${par}`);
}

const archivo = leerJSON(rutaResultados);
const datos = entrada();
const lista = Array.isArray(datos) ? datos : datos.partidos || [];

let sumados = 0, actualizados = 0;
const rechazados = [];

for (const p of lista) {
  if (!validos.has(p.id)) { rechazados.push(`${p.id}: no está en el fixture`); continue; }
  const gol = (x) => Number.isInteger(x) && x >= 0 && x <= 20;
  let entrada_;
  if (p.post === true) entrada_ = { post: true, nota: String(p.nota || '').slice(0, 60) };
  else if (gol(p.ga) && gol(p.gb)) entrada_ = { ga: p.ga, gb: p.gb };
  else { rechazados.push(`${p.id}: marcador inválido`); continue; }

  const antes = archivo.partidos[p.id];
  if (JSON.stringify(antes) === JSON.stringify(entrada_)) continue;
  if (antes) actualizados++; else sumados++;
  archivo.partidos[p.id] = entrada_;
}

// La última fecha completa es la mayor con sus 15 partidos jugados.
const porFecha = {};
for (const id of validos) {
  const f = Number(id.slice(1, id.indexOf('_')));
  const r = archivo.partidos[id];
  porFecha[f] = porFecha[f] || { total: 0, jugados: 0 };
  porFecha[f].total++;
  if (r && Number.isInteger(r.ga) && Number.isInteger(r.gb)) porFecha[f].jugados++;
}
const completas = Object.entries(porFecha)
  .filter(([, v]) => v.jugados === v.total).map(([f]) => Number(f));
archivo.ultimaFechaCompleta = completas.length ? Math.max(...completas) : 0;
archivo.actualizado = new Date().toISOString().slice(0, 10);

const ordenados = {};
for (const id of [...Object.keys(archivo.partidos)].sort(
  (a, b) => Number(a.slice(1, a.indexOf('_'))) - Number(b.slice(1, b.indexOf('_'))) || a.localeCompare(b)
)) ordenados[id] = archivo.partidos[id];
archivo.partidos = ordenados;

writeFileSync(rutaResultados, JSON.stringify(archivo, null, 2) + '\n');

console.log(`Nuevos: ${sumados}. Corregidos: ${actualizados}. Última fecha completa: ${archivo.ultimaFechaCompleta}.`);
if (rechazados.length) {
  console.log('Rechazados:');
  for (const r of rechazados) console.log('  - ' + r);
}
if (!sumados && !actualizados) console.log('No hubo cambios.');
