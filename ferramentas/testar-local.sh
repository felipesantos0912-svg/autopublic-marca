#!/usr/bin/env bash
# Teste local completo do patch, numa pasta de trabalho NOVA (não apaga nada).
# Uso: bash ferramentas/testar-local.sh <pasta-de-trabalho-inexistente> [url-do-codigo-fonte]
set -euo pipefail
MARCA="$(cd "$(dirname "$0")/.." && pwd)"
T="${1:?informe uma pasta de trabalho que ainda não exista}"
FONTE="${2:-}"
[ -e "$T" ] && { echo "A pasta $T já existe; use outro nome."; exit 2; }
mkdir -p "$T"
cp -r "$MARCA/original-next" "$T/next"
cp -r "$MARCA/original-backend/dist" "$T/dist"
cp -r "$MARCA/original-orchestrator/dist" "$T/dist-orq"
cp -r "$MARCA/original/apps/frontend/public" "$T/public"
cp "$MARCA/original/etc/nginx/nginx.conf" "$T/nginx.conf"

echo "== aplicando o patch"
node "$MARCA/patch/aplicar-marca.mjs" --next "$T/next" --dist "$T/dist" --dist "$T/dist-orq" --public "$T/public" --marca "$MARCA" --admin-email felipe@agenciadeliveryfood.com.br --nginx "$T/nginx.conf" ${FONTE:+--fonte-url "$FONTE"}

echo "== segunda rodada (idempotência)"
node "$MARCA/patch/aplicar-marca.mjs" --next "$T/next" --dist "$T/dist" --dist "$T/dist-orq" --public "$T/public" --marca "$MARCA" --admin-email felipe@agenciadeliveryfood.com.br --nginx "$T/nginx.conf" ${FONTE:+--fonte-url "$FONTE"} | sed -n 1,4p

echo "== sintaxe dos arquivos alterados"
node "$MARCA/ferramentas/verificar-sintaxe.mjs" "$MARCA" "$T"

echo "== traduções executadas de verdade (JSON dentro do JS precisa continuar válido)"
node "$MARCA/ferramentas/verificar-traducoes.mjs" "$MARCA" "$T"

echo "== resíduos (esperado: 0 em tudo, exceto onde indicado)"
cd "$T"
for s in 'js.stripe.com' 'check-for-updates' "sendEmail('nevo@postiz.com'" 'RoboMultipost' 'Robô MultiPost' 'Entrepreneurs use' 'Vincent L' 'postiz.com/terms' 'postiz.com/privacy' 'BdsCVvEYgHU' 'Your Gitroom' '"$1"' 'TestimonialComponent,{})]})'; do
  printf '%-34s arquivos=%s\n' "$s" "$(grep -rlF -- "$s" next dist dist-orq --include=*.js --include=*.json --include=*.html --include=*.rsc 2>/dev/null | wc -l)"
done

echo "== correções de comportamento do app (contagens esperadas entre parênteses)"
printf 'soma de métricas sem Number()   (0): %s\n' "$(grep -rlE '\.data\.reduce\(\([A-Za-z_$]+,[A-Za-z_$]+\)=>[A-Za-z_$]+\+[A-Za-z_$]+\.total,0\)' next --include=*.js 2>/dev/null | wc -l)"
printf 'soma de métricas com Number()   (>=1): %s\n' "$(grep -rlF 'Number(' next --include=*.js 2>/dev/null | xargs grep -lE '\.data\.reduce\(\([A-Za-z_$]+,[A-Za-z_$]+\)=>[A-Za-z_$]+\+Number\([A-Za-z_$]+\.total\)' 2>/dev/null | wc -l)"
printf 'percentageChange fixo em 5      (0): %s\n' "$(grep -rlE 'percentageChange: 5\b' dist dist-orq --include=*.js 2>/dev/null | wc -l)"
printf 'perfil gravado ao atualizar     (2): %s\n' "$(grep -rlF 'profileId && !refresh' dist dist-orq --include=*.js 2>/dev/null | wc -l)"
printf 'aviso de erro ao salvar canal   (>=1): %s\n' "$(grep -rlF 'position:fixed;top:16px;right:16px;z-index:99999' next --include=*.js 2>/dev/null | wc -l)"
printf 'nginx: regra de revalidação do JS (1): %s\n' "$(grep -c 'location ~ \^/_next/static/chunks' "$T/nginx.conf")"
printf 'nginx: Cache-Control no-cache      (1): %s\n' "$(grep -c 'add_header Cache-Control "no-cache" always' "$T/nginx.conf")"
