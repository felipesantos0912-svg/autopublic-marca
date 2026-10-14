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

echo "== aplicando o patch"
node "$MARCA/patch/aplicar-marca.mjs" --next "$T/next" --dist "$T/dist" --dist "$T/dist-orq" --public "$T/public" --marca "$MARCA" ${FONTE:+--fonte-url "$FONTE"}

echo "== segunda rodada (idempotência)"
node "$MARCA/patch/aplicar-marca.mjs" --next "$T/next" --dist "$T/dist" --dist "$T/dist-orq" --public "$T/public" --marca "$MARCA" ${FONTE:+--fonte-url "$FONTE"} | sed -n 1,4p

echo "== sintaxe dos arquivos alterados"
node "$MARCA/ferramentas/verificar-sintaxe.mjs" "$MARCA" "$T"

echo "== resíduos (esperado: 0 em tudo, exceto onde indicado)"
cd "$T"
for s in 'Robô MultiPost' 'Entrepreneurs use' 'Vincent L' 'postiz.com/terms' 'postiz.com/privacy' 'BdsCVvEYgHU' 'Your Gitroom' '"$1"' 'TestimonialComponent,{})]})'; do
  printf '%-34s arquivos=%s\n' "$s" "$(grep -rlF -- "$s" next dist dist-orq --include=*.js --include=*.json --include=*.html --include=*.rsc 2>/dev/null | wc -l)"
done
