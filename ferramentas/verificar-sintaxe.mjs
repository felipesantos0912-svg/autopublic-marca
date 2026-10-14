// Confere que os arquivos alterados pelo patch continuam válidos (JS compila, JSON lê).
// Compara cada arquivo de "trabalho" com o original: só acusa se o original estava OK e o alterado quebrou.
// Uso: node verificar-sintaxe.mjs <pasta-marca> <pasta-trabalho>
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const base = process.argv[2];
const trab = process.argv[3];
const pares = [
  [path.join(trab, 'next/static'), path.join(base, 'original-next/static')],
  [path.join(trab, 'next/server'), path.join(base, 'original-next/server')],
  [path.join(trab, 'dist'), path.join(base, 'original-backend/dist')],
  [path.join(trab, 'dist-orq'), path.join(base, 'original-orchestrator/dist')],
];

function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}
const compila = (txt, ext) => {
  try {
    if (ext === '.json') JSON.parse(txt);
    else new vm.Script(txt);
    return null;
  } catch (e) {
    return String(e.message).slice(0, 160);
  }
};

let alterados = 0, quebrados = 0, jaQuebradosNoOriginal = 0;
for (const [novo, velho] of pares) {
  for (const f of walk(novo)) {
    const ext = path.extname(f);
    if (!['.js', '.json'].includes(ext)) continue;
    const rel = path.relative(novo, f);
    const fo = path.join(velho, rel);
    if (!fs.existsSync(fo)) continue; // arquivo renomeado/novo
    const a = fs.readFileSync(f, 'utf8');
    const o = fs.readFileSync(fo, 'utf8');
    if (a === o) continue;
    alterados++;
    const erroNovo = compila(a, ext);
    if (erroNovo) {
      if (compila(o, ext)) jaQuebradosNoOriginal++;
      else {
        quebrados++;
        console.log('QUEBROU:', rel, '->', erroNovo);
      }
    }
  }
}
console.log(`alterados: ${alterados} | quebrados pelo patch: ${quebrados} | (já inválidos no original p/ vm: ${jaQuebradosNoOriginal})`);
process.exit(quebrados ? 1 : 0);
