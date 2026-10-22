import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { construir, calcular, cruces, promedio, queMeConviene } from '../src/model.js';
import { chances, rngSemilla } from '../src/chances.js';

const leer = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const equiposJson = leer('../data/equipos.json');
const fixtureJson = leer('../data/fixture.json');
const resultadosJson = leer('../data/resultados.json');

const base = construir(equiposJson, fixtureJson);
const estado = calcular(base, resultadosJson.partidos);

test('el fixture tiene 16 fechas de 15 partidos, con el arrastre de la 11', () => {
  assert.equal(base.partidos.filter((m) => m.fecha >= 12).length, 5 * 15);
  // Cada equipo juega una sola vez por fecha
  for (const f of [12, 13, 14, 15, 16]) {
    const equipos = base.partidos.filter((m) => m.fecha === f).flatMap((m) => [m.local, m.visita]);
    assert.equal(new Set(equipos).size, 30, `fecha ${f} repite equipos`);
  }
});

test('la tabla del Clausura coincide con la real tras la fecha 13', () => {
  assert.deepEqual(estado.zonaA, [
    'INS', 'BOC', 'DYJ', 'VEL', 'LAN', 'NOB', 'GM', 'IND',
    'SLO', 'ELP', 'UNI', 'RIE', 'PLA', 'CCO', 'TAL',
  ]);
  assert.deepEqual(estado.zonaB, [
    'ROS', 'ARG', 'BEL', 'GLP', 'SAR', 'RIV', 'BAR', 'HUR',
    'IRI', 'ATU', 'TIG', 'BAN', 'RAC', 'ERC', 'ALD',
  ]);
});

test('puntos y diferencia de gol de referencia', () => {
  const T = estado.equipos;
  const esperado = {
    INS: [29, 10], BOC: [24, 7], DYJ: [24, 6], VEL: [24, 5], LAN: [23, 7],
    ROS: [25, 9], ARG: [25, 6], BAR: [19, 1], HUR: [19, 0], IRI: [19, -4],
    ALD: [8, -8], TAL: [9, -8],
  };
  for (const [code, [pts, dg]] of Object.entries(esperado)) {
    assert.equal(T[code].pts, pts, `${code} puntos`);
    assert.equal(T[code].dg, dg, `${code} diferencia de gol`);
  }
});

test('quedan por jugar las fechas 14 a 16', () => {
  assert.equal(estado.ultimaFecha, 13);
  assert.equal(estado.pendientes.length, 45);
  assert.equal(estado.enJuego, 0);
  assert.equal(estado.atrasados, 0);
});

test('los cruces enfrentan 1º de una zona con 8º de la otra', () => {
  const c = cruces(estado);
  assert.equal(c.length, 8);
  assert.equal(c[0].local, 'INS');
  assert.equal(c[0].visita, 'HUR');
  assert.equal(c[7].local, 'IND');
  assert.equal(c[7].visita, 'ROS');
});

test('el promedio divide puntos por partidos jugados', () => {
  const e = estado.equipos.BOC;
  assert.equal(promedio(e), e.promPts / e.promPJ);
  assert.ok(promedio(estado.equipos.BOC) > promedio(estado.equipos.ALD));
});

test('las conveniencias nombran rivales cercanos y nunca partidos propios', () => {
  const r = queMeConviene(estado, 'ROS', 'clausura', 4);
  const frases = r.flatMap((x) => x.frases);
  assert.ok(frases.length > 0);
  assert.ok(!frases.some((f) => f.includes('Rosario Central')));
  assert.ok(frases.some((f) => f.includes('Argentinos')));
});

test('las chances suman coherente y son reproducibles con semilla', () => {
  const a = chances(base, estado, {}, 400, rngSemilla(7));
  const b = chances(base, estado, {}, 400, rngSemilla(7));
  assert.deepEqual(a, b);

  const playoffs = Object.values(a).reduce((s, x) => s + x.playoffs, 0);
  assert.ok(Math.abs(playoffs - 1600) < 1, `clasifican 16 equipos, dio ${playoffs / 100}`);
  const descensos = Object.values(a).reduce((s, x) => s + x.descenso, 0);
  assert.ok(descensos >= 199 && descensos <= 201, `bajan 2, dio ${descensos / 100}`);

  for (const v of Object.values(a)) {
    for (const p of Object.values(v)) assert.ok(p >= 0 && p <= 100);
  }
  assert.ok(a.INS.playoffs > a.TAL.playoffs);
});

test('fijar resultados mueve las chances en la dirección esperada', () => {
  const libre = chances(base, estado, {}, 400, rngSemilla(3));
  const ganaTodo = {};
  for (const m of estado.pendientes) {
    if (m.local === 'SLO') ganaTodo[m.id] = 'L';
    else if (m.visita === 'SLO') ganaTodo[m.id] = 'V';
  }
  const forzado = chances(base, estado, ganaTodo, 400, rngSemilla(3));
  assert.ok(forzado.SLO.playoffs > libre.SLO.playoffs + 20);

  // Talleres ya no llega: 9 pts y 9 en juego, con el 8º en 19.
  assert.equal(libre.TAL.playoffs, 0);
});
