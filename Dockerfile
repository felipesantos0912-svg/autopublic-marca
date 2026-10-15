# Autopublic = robo-multipost 0.5.6 (derivado do Postiz, AGPL-3.0) + camada de marca.
# A camada de marca NÃO recompila o app: aplica substituições de texto/cores/imagens
# sobre os arquivos já compilados da imagem original (ver patch/aplicar-marca.mjs).
#
# Build (na pasta deste arquivo):
#   docker build -t autopublic:marca-1 --build-arg FONTE_URL=<url-do-codigo-fonte> .
#
# Imagem original fixada pelo digest (a tag 0.5.6 pode, em tese, ser reapontada):
ARG BASE=ghcr.io/maiconramos/robo-multipost@sha256:4c262a0a42e25944e9387aa1c8aa654d3b66c427ab5d4425d790e6119b880fe6
FROM ${BASE}

# Link "Código-fonte (AGPL-3.0)" exibido na tela de login (opcional, mas recomendado).
ARG FONTE_URL=""
# Quem recebe avisos internos do sistema (no original, o recurso "agência" avisava o autor do Postiz).
ARG ADMIN_EMAIL="felipe@agenciadeliveryfood.com.br"

# Pasta onde o servidor monta o segredo do reenvio dos eventos do Instagram (ver patch do nginx); vazia na imagem.
RUN mkdir -p /etc/nginx/raiox

COPY patch /tmp/autopublic-marca/patch
COPY assets /tmp/autopublic-marca/assets
COPY autopublic-theme.css /tmp/autopublic-marca/autopublic-theme.css

RUN node /tmp/autopublic-marca/patch/aplicar-marca.mjs \
      --next /app/apps/frontend/.next \
      --dist /app/apps/backend/dist \
      --dist /app/apps/orchestrator/dist \
      --public /app/apps/frontend/public \
      --nginx /etc/nginx/nginx.conf \
      --marca /tmp/autopublic-marca \
      ${FONTE_URL:+--fonte-url "$FONTE_URL"} \
      ${ADMIN_EMAIL:+--admin-email "$ADMIN_EMAIL"} \
 && nginx -t \
 && rm -rf /tmp/autopublic-marca

LABEL org.opencontainers.image.title="Autopublic" \
      org.opencontainers.image.description="Agendador de posts (derivado de robo-multipost/Postiz, AGPL-3.0) com a marca Autopublic" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.base.name="ghcr.io/maiconramos/robo-multipost:0.5.6"
