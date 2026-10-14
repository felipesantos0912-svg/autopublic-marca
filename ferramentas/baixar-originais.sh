#!/usr/bin/env bash
# Recria as pastas de teste (original, original-next, original-backend, original-orchestrator)
# a partir da IMAGEM ORIGINAL do app (robo-multipost 0.5.6, fixada por digest), rodando num servidor com Docker.
# Usa um container descartável da imagem original: não mexe no app que está em produção.
#
# Uso:   bash ferramentas/baixar-originais.sh <usuario@servidor> [pasta-de-destino] [-i chave-ssh]
# Ex.:   bash ferramentas/baixar-originais.sh root@meu-servidor . -i ~/.ssh/minha_chave
set -euo pipefail

ALVO="${1:?informe usuario@servidor (precisa ter Docker e a imagem original baixada)}"
DESTINO="${2:-$(cd "$(dirname "$0")/.." && pwd)}"
shift $(( $# >= 2 ? 2 : $# )) || true
SSH_EXTRA=("$@")

IMAGEM="ghcr.io/maiconramos/robo-multipost@sha256:4c262a0a42e25944e9387aa1c8aa654d3b66c427ab5d4425d790e6119b880fe6"

remoto() { ssh "${SSH_EXTRA[@]}" -o BatchMode=yes "$ALVO" "$@"; }
tar_da_imagem() { # $1 = pasta base dentro da imagem; demais = o que empacotar
  local base="$1"; shift
  remoto "docker run --rm --entrypoint tar $IMAGEM -cf - -C $base --exclude='*.map' $*"
}

for pasta in original original-next original-backend original-orchestrator; do
  [ -e "$DESTINO/$pasta" ] && { echo "A pasta $DESTINO/$pasta já existe; apague ou escolha outro destino."; exit 2; }
done

echo "== original-next (.next/static e .next/server)"
mkdir -p "$DESTINO/original-next"
tar_da_imagem /app/apps/frontend/.next static server | tar -xf - -C "$DESTINO/original-next"

echo "== original-backend (dist)"
mkdir -p "$DESTINO/original-backend"
tar_da_imagem /app/apps/backend dist | tar -xf - -C "$DESTINO/original-backend"

echo "== original-orchestrator (dist)"
mkdir -p "$DESTINO/original-orchestrator"
tar_da_imagem /app/apps/orchestrator dist | tar -xf - -C "$DESTINO/original-orchestrator"

echo "== original (public, css, traduções)"
mkdir -p "$DESTINO/original"
tar_da_imagem /app apps/frontend/public apps/frontend/src/app/colors.css apps/frontend/src/app/global.css \
  apps/frontend/tailwind.config.cjs \
  libraries/react-shared-libraries/src/translation/locales/pt/translation.json \
  libraries/react-shared-libraries/src/translation/locales/en/translation.json | tar -xf - -C "$DESTINO/original"

echo "== conferência (devem ser do app ORIGINAL, ou seja, ainda com a marca antiga)"
printf 'arquivos com "Robô MultiPost" em original-next: %s\n' "$(grep -rlF 'Robô MultiPost' "$DESTINO/original-next" --include=*.js 2>/dev/null | wc -l)"
du -sh "$DESTINO"/original* | sed 's#.*/##' | paste -sd' ' -
