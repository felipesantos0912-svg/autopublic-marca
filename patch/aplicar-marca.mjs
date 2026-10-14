#!/usr/bin/env node
/**
 * Autopublic — aplica a marca sobre a imagem robo-multipost (Postiz) 0.5.6.
 *
 * O que faz (tudo por substituição de texto nos arquivos JÁ compilados; não recompila nada):
 *   1. troca o nome ("Robô MultiPost", "Multipost", "Postiz", "Gitroom") por "Autopublic";
 *   2. remove textos de marketing do curso/Postiz (depoimentos, "20.000+ empreendedores", cobrança, FAQ, vídeo);
 *   3. troca o painel do login por um painel da marca;
 *   4. troca cores fixas roxo/rosa/vermelho por dourado;
 *   5. anexa o CSS da marca e renomeia o arquivo (evita cache antigo no navegador);
 *   6. copia logos/favicons, recolore ilustrações SVG e apaga fotos de depoimentos.
 *
 * Idempotente: rodar duas vezes não estraga nada (a 2ª não encontra mais o que trocar).
 *
 * Uso:
 *   node aplicar-marca.mjs --next <.next> --dist <backend/dist> [--dist <orchestrator/dist>] \
 *        --public <frontend/public> --marca <pasta autopublic-marca> [--fonte-url <url do código-fonte>] [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

const arg = (n) => {
  const i = process.argv.indexOf('--' + n);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const argTodos = (n) => process.argv.flatMap((a, i, v) => (a === '--' + n ? [v[i + 1]] : []));
const NEXT = arg('next');
const DISTS = argTodos('dist'); // pode repetir: backend e orquestrador
const PUBLIC = arg('public');
const MARCA = arg('marca');
const FONTE_URL = arg('fonte-url') || '';
const ADMIN_EMAIL = arg('admin-email') || ''; // quem recebe avisos internos do sistema (no original iam para o autor do Postiz)
const DRY = process.argv.includes('--dry');

if (!NEXT || !MARCA) {
  console.error('Uso: aplicar-marca.mjs --next <.next> [--dist <dist>] [--public <public>] --marca <pasta> [--fonte-url URL] [--dry]');
  process.exit(2);
}

const LEGAL_TERMOS = 'https://www.agenciadeliveryfood.com.br/autopublic-termos.php';
const LEGAL_PRIVACIDADE = 'https://www.agenciadeliveryfood.com.br/autopublic-privacidade.php';

// ------------------------------------------------------------------ utilidades
const stats = new Map();
const bump = (nome, n = 1) => stats.set(nome, (stats.get(nome) || 0) + n);

function rep(text, re, to, nome) {
  let n = 0;
  const out = text.replace(re, (...a) => {
    n++;
    return typeof to === 'function' ? to(...a) : to;
  });
  if (n) bump(nome, n);
  return out;
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'cache' || e.name === 'node_modules') continue;
      yield* walk(p);
    } else yield p;
  }
}

const EXT_TEXTO = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.rsc', '.meta', '.txt']);
const ehTexto = (f) => EXT_TEXTO.has(path.extname(f)) && !f.endsWith('.map');

/** Acha o ']' que fecha o '[' em text[ini]; respeita strings. */
function fechaColchete(text, ini) {
  let prof = 0;
  let asp = null;
  for (let i = ini; i < text.length; i++) {
    const c = text[i];
    if (asp) {
      if (c === '\\') i++;
      else if (c === asp) asp = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') asp = c;
    else if (c === '[') prof++;
    else if (c === ']') {
      prof--;
      if (prof === 0) return i;
    }
  }
  return -1;
}

// ------------------------------------------------------------------ 1) marca / nome
const TITULOS = [
  ['Calendar', 'Calendário'], ['Settings', 'Configurações'], ['Register', 'Cadastro'], ['Preview', 'Prévia'],
  ['Plugs', 'Divulgações'], ['Media', 'Mídia'], ['Login', 'Entrar'], ['Billing', 'Cobrança'],
  ['Analytics', 'Métricas'], ['Integrations', 'Integrações'], ['Forgot Password', 'Esqueci a senha'],
];

function marcaNome(t) {
  // títulos de aba: `${isGeneralServerSide()?"Robô MultiPost":"Gitroom"} Login`
  t = rep(t, /\$\{[^{}]*?\?"Robô MultiPost( [^"]*)?":"Gitroom[^"]*"\}/g, (_, s) => 'Autopublic' + (s || ''), 'titulo-aba');
  t = rep(t, /\$\{\w+\?"Postiz":"Gitroom"\}/g, 'Autopublic', 'titulo-postiz');
  t = rep(t, /\w+\?" Multipost":" Gitroom"/g, '" Autopublic"', 'logout-nome');
  for (const [en, pt] of TITULOS) {
    t = rep(t, new RegExp('Autopublic ' + en + '(?=[`"\'])', 'g'), 'Autopublic · ' + pt, 'titulo-pt');
  }
  t = rep(t, /Autopublic - Activate your account/g, 'Autopublic - Ative sua conta', 'titulo-pt');
  // nome nos textos
  t = rep(t, /Rob[ôo] MultiPost/g, 'Autopublic', 'nome-robo-multipost');
  t = rep(t, /\bMultipost\b/g, 'Autopublic', 'nome-multipost');
  t = rep(t, /(?<![\w$.\/])Postiz(?![\w$])/g, 'Autopublic', 'nome-postiz');
  t = rep(t, /placeholder:"MyPostizAgent"/g, 'placeholder:"MeuAgente"', 'placeholder-agente');
  t = rep(t, /"gitroom":"Gitroom"/g, '"gitroom":"Autopublic"', 'nome-gitroom');
  // rodapé dos e-mails do sistema
  t = rep(t, /&copy; 2024 Your Gitroom Limited All rights reserved\./g, '&copy; DF Agência Digital LTDA. Todos os direitos reservados.', 'email-rodape');
  // identificação do programa em chamadas a serviços externos
  t = rep(t, /RoboMultipost\/1\.0/g, 'Autopublic/1.0', 'user-agent');
  // o recurso "agência" do Postiz avisava o autor do projeto original (nevo@postiz.com) por e-mail:
  // redireciona o aviso para o administrador do Autopublic (ou, sem e-mail informado, avisa no resumo)
  if (ADMIN_EMAIL) {
    t = rep(t, /sendEmail\('nevo@postiz\.com'/g, `sendEmail(${JSON.stringify(ADMIN_EMAIL).replace(/"/g, "'")}`, 'email-agencia-interno');
  } else if (t.includes("sendEmail('nevo@postiz.com'")) {
    bump('ATENCAO-email-para-postiz-sem---admin-email');
  }
  return t;
}

// ------------------------------------------------------------------ 2) marketing / links
const CHAVES_VAZIAS = [
  'billing_[a-z0-9_]+', 'faq_[a-z0-9_]+', 'discount_applied_50', 'accept_discount_offer', 'apply_discount_3_months',
  'grow_fast_with_app', 'see_power_of_app', 'join_10000_entrepreneurs_who_use_postiz', 'to_manage_all_your_social_media',
  'you_will_never_be_charged_again', 'start_7_days_free_trial', 'check_n8n', 'add_free_subscription',
];
const CHAVES_TEXTO = {
  watch_tutorial: 'Começar',
  watch_tutorial_title: 'Tudo pronto!',
  watch_tutorial_description: 'Agora é só criar a sua primeira publicação no Calendário.',
};
const RE_CHAVE_VAZIA = new RegExp('^(' + CHAVES_VAZIAS.join('|') + ')$');
const RE_ALGUMA_CHAVE = new RegExp('"(' + CHAVES_VAZIAS.concat(Object.keys(CHAVES_TEXTO)).join('|') + ')"');

/**
 * As traduções ficam dentro do código compilado como JSON.parse('{...}'): um JSON dentro de um texto JS.
 * Ali, uma aspa escapada do JSON aparece como \\" e uma regex simples erra o fim do valor (aprendido na prática:
 * quebrou o JSON de todos os idiomas). Por isso: lê o texto JS, faz JSON.parse de verdade, altera as chaves
 * e grava de volta escapando de novo.
 */
function traducoes(t) {
  const abre = "JSON.parse('";
  let saida = '';
  let i = 0;
  for (;;) {
    const k = t.indexOf(abre, i);
    if (k < 0) {
      saida += t.slice(i);
      break;
    }
    const ini = k + abre.length;
    let j = ini;
    while (j < t.length) {
      const c = t[j];
      if (c === '\\') j += 2;
      else if (c === "'") break;
      else j++;
    }
    const literal = t.slice(ini, j);
    saida += t.slice(i, ini);
    let novo = literal;
    if (RE_ALGUMA_CHAVE.test(literal)) {
      try {
        const obj = JSON.parse(new Function("return '" + literal + "'")());
        let mudou = false;
        for (const chave of Object.keys(obj)) {
          if (RE_CHAVE_VAZIA.test(chave) && obj[chave] !== '') {
            obj[chave] = '';
            mudou = true;
            bump('texto-marketing-esvaziado');
          } else if (Object.hasOwn(CHAVES_TEXTO, chave) && obj[chave] !== CHAVES_TEXTO[chave]) {
            obj[chave] = CHAVES_TEXTO[chave];
            mudou = true;
            bump('texto-onboarding');
          }
        }
        if (mudou) novo = JSON.stringify(obj).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      } catch (e) {
        bump('traducao-nao-processada');
      }
    }
    saida += novo;
    i = j;
  }
  return saida;
}

function marketing(t) {
  t = traducoes(t);
  // vídeo de tutorial do Postiz no onboarding
  t = rep(t, /https:\/\/www\.youtube\.com\/embed\/BdsCVvEYgHU[^"]*/g, 'about:blank', 'video-postiz');
  t = rep(t, /title:"Postiz Tutorial"/g, 'title:"Tutorial"', 'video-titulo');
  t = rep(t, /title:"Autopublic Tutorial"/g, 'title:"Tutorial"', 'video-titulo');
  // links
  t = rep(t, /https:\/\/postiz\.com\/terms/g, LEGAL_TERMOS, 'link-termos');
  t = rep(t, /https:\/\/postiz\.com\/privacy/g, LEGAL_PRIVACIDADE, 'link-privacidade');
  t = rep(t, /https:\/\/www\.linkedin\.com\/company\/gitroom/g, 'https://www.linkedin.com/company/sua-empresa', 'placeholder-linkedin');
  t = rep(t, /https:\/\/affiliate\.postiz\.com/g, '/', 'link-afiliado');
  // depoimentos de usuários do Postiz (lista fixa no código): esvazia a lista
  let guard = 0;
  for (;;) {
    const i = t.indexOf('[{picture:"/auth/avatars/');
    if (i < 0 || guard++ > 10) break;
    const f = fechaColchete(t, i);
    if (f < 0) break;
    t = t.slice(0, i) + '[]' + t.slice(f + 1);
    bump('depoimentos-removidos');
  }
  return t;
}

// ------------------------------------------------------------------ 3) painel do login
function loginPainel(t) {
  const reCont = /"bg-\[#0E0E0E\] flex flex-1 p-\[12px\] gap-\[12px\] min-h-screen w-screen text-white"/g;
  t = rep(t, reCont, '"light autopublic-auth flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen"', 'login-container');
  t = rep(t, /rounded-\[12px\] text-white p-\[12px\] bg-\[#1A1919\]/g, 'rounded-[12px] p-[12px] autopublic-card', 'login-cartao');
  t = rep(t, /justify-center gap-\[20px\] h-full flex flex-col text-white"/g, 'justify-center gap-[20px] h-full flex flex-col"', 'login-form');
  const re = /\(0,(\w+)\.jsxs\)\("div",\{className:"text-\[36px\] flex-1 pt-\[88px\] hidden lg:flex flex-col items-center",children:\[.*?\.TestimonialComponent,\{\}\)\]\}\)/gs;
  t = rep(
    t,
    re,
    (_, j) => {
      const fonte = FONTE_URL
        ? `,(0,${j}.jsx)("a",{className:"autopublic-fonte",href:${JSON.stringify(FONTE_URL)},target:"_blank",rel:"noopener noreferrer",children:"Código-fonte (AGPL-3.0)"})`
        : '';
      return (
        `(0,${j}.jsxs)("div",{className:"autopublic-painel hidden lg:flex",children:[` +
        `(0,${j}.jsx)("div",{className:"autopublic-painel-marca"}),` +
        `(0,${j}.jsx)("h2",{children:"Suas redes sociais, num só lugar."}),` +
        `(0,${j}.jsx)("p",{children:"Agende, publique e automatize respostas no Instagram e no Facebook."})${fonte}]})`
      );
    },
    'login-painel',
  );
  return t;
}

// ------------------------------------------------------------------ 4) cores fixas
const CORES = {
  '612bd3': 'd4af37', '622aff': 'd4af37', '622ff6': 'd4af37', '612ad5': 'd4af37', '8a63d2': 'd4af37',
  '8b5cf6': 'b8941f', '5520cb': 'b8941f', '5023b8': 'b8941f', '7640e0': 'c9a227', '7b3ff2': 'c9a227',
  '7c3aff': 'c9a227', '9d6eff': 'e8c964', '855dcd': 'c9a227', d82d7e: 'b8941f', fc69ff: 'b8941f',
  aa0fa4: '8a6d1a', cd2628: 'd4af37', cd266c: '8a6d1a', c5219f: 'e8c964', b41c1f: 'b8941f',
  e28e8e: 'ead9a0', b69dec: 'b8941f',
};
const RE_CORES = new RegExp('(?<![\\[\\w#])#(' + Object.keys(CORES).join('|') + ')\\b', 'gi');
// o "(?<!\[)" protege nomes de classe do Tailwind, tipo bg-[#612BD3], que dependem do CSS gerado
function cores(t) {
  return rep(t, RE_CORES, (_, h) => '#' + CORES[h.toLowerCase()], 'cor-fixa');
}

// ------------------------------------------------------------------ execução
function processaArquivos(arquivos, fns, rotulo) {
  let mudou = 0;
  for (const f of arquivos) {
    if (!ehTexto(f)) continue;
    const orig = fs.readFileSync(f, 'utf8');
    let t = orig;
    for (const fn of fns) t = fn(t);
    if (t !== orig) {
      mudou++;
      if (!DRY) fs.writeFileSync(f, t);
    }
  }
  console.log(`${rotulo}: ${mudou} arquivo(s) alterado(s)`);
}

const arquivosNext = [...walk(path.join(NEXT, 'static')), ...walk(path.join(NEXT, 'server'))];
processaArquivos(arquivosNext, [loginPainel, marketing, marcaNome, cores], 'frontend (.next)');
for (const d of DISTS) processaArquivos([...walk(d)], [marketing, marcaNome, cores], `backend (${d})`);

// ------------------------------------------------------------------ 5) CSS da marca
const cssTema = fs.readFileSync(path.join(MARCA, 'autopublic-theme.css'), 'utf8');
const chunksDir = path.join(NEXT, 'static', 'chunks');
const css = fs.existsSync(chunksDir)
  ? fs.readdirSync(chunksDir).filter((f) => f.endsWith('.css') && fs.readFileSync(path.join(chunksDir, f), 'utf8').includes('--new-btn-primary'))
  : [];
if (css.length !== 1) {
  console.log(`ATENÇÃO: esperava 1 CSS principal (com --new-btn-primary), achei ${css.length}: ${css.join(', ')}`);
} else {
  const velho = css[0];
  const jaFeito = fs.readFileSync(path.join(chunksDir, velho), 'utf8').includes('Autopublic — camada de marca');
  if (jaFeito) {
    console.log(`CSS ${velho} já tem a marca; nada a fazer.`);
  } else {
    const novo = velho.replace(/\.css$/, '-ap1.css');
    const conteudo = fs.readFileSync(path.join(chunksDir, velho), 'utf8') + '\n' + cssTema;
    if (!DRY) {
      fs.writeFileSync(path.join(chunksDir, novo), conteudo);
      fs.unlinkSync(path.join(chunksDir, velho));
    }
    let refs = 0;
    for (const f of [...walk(path.join(NEXT, 'static')), ...walk(path.join(NEXT, 'server'))]) {
      if (!ehTexto(f)) continue;
      const t = fs.readFileSync(f, 'utf8');
      if (t.includes(velho)) {
        refs++;
        if (!DRY) fs.writeFileSync(f, t.split(velho).join(novo));
      }
    }
    console.log(`CSS principal: ${velho} -> ${novo} (${refs} arquivo(s) com a referência atualizada)`);
  }
}

// ------------------------------------------------------------------ 6) imagens / arquivos públicos
if (PUBLIC) {
  const assets = path.join(MARCA, 'assets');
  const copia = (de, para) => {
    if (!fs.existsSync(path.join(assets, de))) return;
    if (!DRY) {
      fs.mkdirSync(path.dirname(path.join(PUBLIC, para)), { recursive: true });
      fs.copyFileSync(path.join(assets, de), path.join(PUBLIC, para));
    }
    bump('arquivo-publico-copiado');
  };
  copia('autopublic-mark.svg', 'autopublic/autopublic-mark.svg');
  copia('autopublic-lockup-light.png', 'autopublic/autopublic-lockup-light.png');
  copia('autopublic-lockup-dark.png', 'autopublic/autopublic-lockup-dark.png');
  copia('favicon.ico', 'favicon.ico');
  copia('favicon.png', 'favicon.png');
  copia('favicon.png', 'postiz-fav.png');
  copia('apple-touch-icon.png', 'apple-touch-icon.png');
  for (const n of ['logo.svg', 'logo-text.svg', 'postiz.svg', 'postiz-text.svg']) copia('autopublic-mark.svg', n);

  // fotos de depoimentos e artes do login do curso
  for (const f of [...walk(path.join(PUBLIC, 'auth'))]) {
    if (/avatars[\\/]|bg-login\.png$|login-box\.png$/.test(f)) {
      if (!DRY) fs.unlinkSync(f);
      bump('arquivo-publico-removido');
    }
  }

  // ilustrações SVG: roxo/rosa -> dourado (mantém a luminosidade)
  const hsl2hex = (h, s, l) => {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  };
  const hex2hsl = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = (mx + mn) / 2;
    let H = 0, S = 0;
    if (mx !== mn) {
      const d = mx - mn;
      S = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      H *= 60;
    }
    return [H, S, L];
  };
  for (const f of walk(PUBLIC)) {
    if (!f.endsWith('.svg') || /[\\/]icons[\\/]/.test(f) || /autopublic/.test(f)) continue;
    const orig = fs.readFileSync(f, 'utf8');
    const novo = orig.replace(/#[0-9a-fA-F]{6}\b/g, (hex) => {
      const [H, S, L] = hex2hsl(hex);
      if (H >= 245 && H <= 345 && S > 0.25) {
        bump('svg-cor-recolorida');
        return hsl2hex(45, Math.min(0.7, S), L);
      }
      return hex;
    });
    if (novo !== orig && !DRY) fs.writeFileSync(f, novo);
  }
}

console.log('\nResumo' + (DRY ? ' (simulação, nada gravado)' : '') + ':');
for (const [k, v] of [...stats.entries()].sort()) console.log(`  ${k}: ${v}`);
