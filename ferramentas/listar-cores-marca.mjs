// Lista as regras do CSS compilado que usam tons de roxo/rosa/magenta/vermelho-marca.
// Uso: node listar-cores-marca.mjs <pasta-com-css>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const arquivos = fs.readdirSync(dir).filter((f) => f.endsWith('.css'));

function hsl(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let H = 0, S = 0;
  const L = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    S = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    H *= 60;
  }
  return [H, S, L];
}

const achados = new Map();
for (const f of arquivos) {
  const css = fs.readFileSync(path.join(dir, f), 'utf8');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    const corpo = m[2];
    if (sel.startsWith(':root') || sel.startsWith('@')) continue;
    if (/bp[56]-/.test(sel)) continue; // Blueprint: cores semânticas (perigo etc.), não são da marca
    const cores = [...(corpo.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [])];
    for (const r of corpo.matchAll(/rgb\((\d+)[ ,]+(\d+)[ ,]+(\d+)/g)) {
      cores.push('#' + [r[1], r[2], r[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join(''));
    }
    for (const c of cores) {
      const [H, S, L] = hsl(c);
      const roxoRosa = H >= 255 && H <= 345 && S > 0.3 && L > 0.15 && L < 0.9;
      const vermelhoMarca = (H <= 8 || H >= 345) && S > 0.55 && L > 0.3 && L < 0.6;
      if (roxoRosa || vermelhoMarca) {
        const k = sel + ' => ' + c.toLowerCase();
        achados.set(k, (achados.get(k) || 0) + 1);
      }
    }
  }
}
const lista = [...achados.keys()].sort();
console.log(lista.length + ' regras com cor de marca antiga');
for (const k of lista) console.log(k.slice(0, 200));
