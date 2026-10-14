// Executa de verdade os módulos de tradução compilados (JSON.parse dentro do .js) e compara com o original.
// Pega o que o teste de sintaxe não pega: JSON inválido dentro de um JSON.parse('...').
// Uso: node verificar-traducoes.mjs <pasta-marca> <pasta-trabalho>
import fs from 'node:fs';
import path from 'node:path';

const [base, trab] = [process.argv[2], process.argv[3]];
const dirs = [
  ['next/server/chunks/ssr', 'original-next/server/chunks/ssr'],
  ['next/static/chunks', 'original-next/static/chunks'],
];

function carrega(arquivo) {
  const code = fs.readFileSync(arquivo, 'utf8');
  const sandbox = { module: { exports: {} }, globalThis: {}, self: {}, window: undefined };
  // chunks de cliente usam (globalThis.TURBOPACK||=[]).push([...]); os de servidor usam module.exports=[...]
  const g = { TURBOPACK: [] };
  const fn = new Function('module', 'globalThis', 'self', 'document', code);
  fn(sandbox.module, g, g, undefined);
  const lista = Array.isArray(sandbox.module.exports) && sandbox.module.exports.length ? sandbox.module.exports : null;
  const empurrados = g.TURBOPACK.flatMap((p) => (Array.isArray(p) ? p : []));
  const out = [];
  const fabricas = lista || empurrados;
  for (let i = 0; i < fabricas.length; i++) {
    if (typeof fabricas[i] !== 'function') continue;
    const mod = { exports: {} };
    try {
      fabricas[i]({ i: () => ({}), s: () => {}, v: () => {}, n: () => {}, l: () => {} }, mod, mod.exports);
    } catch (e) {
      out.push({ erro: String(e.message).slice(0, 120) });
      continue;
    }
    if (mod.exports && typeof mod.exports === 'object' && Object.keys(mod.exports).length > 50) out.push({ chaves: Object.keys(mod.exports).length, obj: mod.exports });
  }
  return out;
}

let verificados = 0, problemas = 0;
for (const [n, o] of dirs) {
  const dn = path.join(trab, n), dor = path.join(base, o);
  for (const f of fs.readdirSync(dn)) {
    if (!f.endsWith('.js')) continue;
    const novo = path.join(dn, f), velho = path.join(dor, f);
    if (!fs.existsSync(velho)) continue;
    const txt = fs.readFileSync(novo, 'utf8');
    if (!/JSON\.parse\(/.test(txt) || !/"[a-z_]+":"/.test(txt)) continue;
    if (txt === fs.readFileSync(velho, 'utf8')) continue;
    verificados++;
    let rn, ro;
    try { rn = carrega(novo); } catch (e) { rn = [{ erro: 'falha ao executar: ' + String(e.message).slice(0, 140) }]; }
    try { ro = carrega(velho); } catch (e) { ro = [{ erro: 'orig falha: ' + String(e.message).slice(0, 140) }]; }
    const erroNovo = rn.find((x) => x.erro);
    const erroVelho = ro.find((x) => x.erro);
    if (erroNovo && !erroVelho) {
      problemas++;
      console.log('QUEBROU:', f, '->', erroNovo.erro);
    }
  }
}
console.log(`módulos de tradução alterados e executados: ${verificados} | quebrados pelo patch: ${problemas}`);
process.exit(problemas ? 1 : 0);
