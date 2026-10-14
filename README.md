# Autopublic — camada de marca

O **Autopublic** é o agendador de posts da Agência Delivery Food (DF Agência Digital LTDA).
Ele é uma **versão modificada** do [Robô MultiPost](https://github.com/maiconramos/robo-multipost) 0.5.6,
que por sua vez é derivado do [Postiz](https://github.com/gitroomhq/postiz-app).
Todos são software livre sob a licença **GNU AGPL-3.0**; o Autopublic continua sob a mesma licença.

Este repositório contém **só a camada de marca** (o que foi mudado). O código do programa em si
é o do projeto original, na versão e imagem indicadas abaixo.

## O que a camada de marca faz

Ela não recompila o app. Aplica substituições nos arquivos **já compilados** da imagem original
(`patch/aplicar-marca.mjs`), em quatro frentes:

1. **Nome**: "Robô MultiPost", "Multipost", "Postiz" e "Gitroom" viram "Autopublic" (títulos de aba, textos, e-mails do sistema).
2. **Marketing do curso removido**: depoimentos de usuários do Postiz e "20.000+ empreendedores" no login, textos de cobrança/FAQ/desconto, vídeo de tutorial do Postiz no onboarding, rodapé "Gitroom Limited" dos e-mails.
3. **Visual**: cores roxo/rosa/vermelho → dourado (`autopublic-theme.css`), logo e favicon novos (`assets/`), painel do login com a marca, logo e ícone trocados, ilustrações recoloridas, menu lateral maior (em telas de até 800 px de altura o app mostrava só texto de 10 px; agora mostra ícone + texto de 12 px). O arquivo de CSS da marca muda de nome a cada alteração (hash do conteúdo), pra o navegador não reaproveitar uma versão antiga.
4. **Links**: Termos e Privacidade apontam para as páginas do Autopublic. Nenhum recurso do app é escondido (Agent, Integrações, Divulgações, login com Google e cadastro continuam disponíveis; cada um depende da sua configuração).

5. **Privacidade**: o recurso "agência" do Postiz enviava um e-mail com dados de quem se cadastrava como agência para o autor do projeto original (`nevo@postiz.com`). Esse aviso agora vai para o administrador do Autopublic (`ADMIN_EMAIL`, argumento de build, padrão `felipe@agenciadeliveryfood.com.br`). O cabeçalho `User-Agent` das chamadas a serviços externos também foi trocado.
   O app original também conectava o navegador de cada usuário a terceiros sem necessidade: o script do **Stripe.js** (carregado em toda página, mesmo com cobrança desligada) e a checagem de versão do **CopilotKit** (`api.cloud.copilotkit.ai/check-for-updates`). Ambas foram neutralizadas (se um dia ligar cobrança com Stripe, desfaça essa parte do patch). A telemetria do CopilotKit no servidor se desliga por variável de ambiente (`COPILOTKIT_TELEMETRY_DISABLED=true` e `DO_NOT_TRACK=true`), documentada abaixo.

Não muda: regras do app, banco de dados, API, integrações com Meta, automações.

## Créditos e licença

Avisos de autoria do projeto original, reproduzidos do arquivo `NOTICE` da imagem (que continua intacto dentro dela):

- **Postiz** — Copyright (c) Postiz / GitRoom HQ, AGPL-3.0 (https://github.com/gitroomhq/postiz-app)
- **Robô MultiPost** — Copyright (c) 2026 Automação Sem Limites, AGPL-3.0 (https://github.com/maiconramos/robo-multipost)

Este repositório (a camada de marca) é distribuído sob a **AGPL-3.0** (arquivo `LICENSE`).
O nome e o logo "Autopublic" são marca da DF Agência Digital LTDA e não são cobertos pela licença do código.

## Imagem original (base)

- Repositório: https://github.com/maiconramos/robo-multipost
- Imagem: `ghcr.io/maiconramos/robo-multipost:0.5.6`
- Digest fixado: `sha256:4c262a0a42e25944e9387aa1c8aa654d3b66c427ab5d4425d790e6119b880fe6`

## Como gerar a imagem

```bash
docker build -t autopublic:marca-1 --build-arg FONTE_URL=<url-do-codigo-fonte> .
```

Para usar, troque a `image:` do serviço do app no `docker-compose.override.yml` para a tag gerada (ex.: `autopublic:marca-4`)
e recrie **só** o app: `docker compose up -d --no-deps postiz`.

Variáveis de ambiente recomendadas no serviço do app (privacidade):

```yaml
COPILOTKIT_TELEMETRY_DISABLED: "true"   # desliga a telemetria anônima do CopilotKit (Segment/Scarf)
DO_NOT_TRACK: "true"
NEXT_TELEMETRY_DISABLED: "1"
```

**Voltar atrás**: reponha `image: ghcr.io/maiconramos/robo-multipost:0.5.6` e recrie o app.

## Teste local (sem Docker)

```bash
bash ferramentas/testar-local.sh <pasta-nova-de-trabalho>
```

Copia os arquivos compilados do app original para a pasta, aplica o patch, roda de novo
(confere que é idempotente), verifica a sintaxe dos arquivos alterados e procura texto antigo que sobrou.

> Os diretórios `original*/` (cópias dos arquivos compilados do app original, usadas só nos testes) não fazem parte
> deste repositório (`.gitignore`). Para recriá-los, rode num servidor com Docker e a imagem original:
> `bash ferramentas/baixar-originais.sh usuario@servidor . -i ~/.ssh/chave` (usa um container descartável da imagem
> original fixada por digest; não mexe no app em produção).

## Cumprimento da AGPL-3.0 (resumo prático — não é parecer jurídico)

- A licença original permanece; o aviso de direitos autorais do projeto original não é removido.
- **Aviso de modificação (§5a)**: o Autopublic foi modificado em 14/10/2026 em relação ao Robô MultiPost 0.5.6 (ver `NOTICE-MODIFICACOES.md`).
- **Oferta do código-fonte (§13)**: quem usa o Autopublic pela rede deve poder obter o código-fonte correspondente da versão
  modificada. Por isso a tela de login mostra o link "Código-fonte (AGPL-3.0)" (parâmetro `FONTE_URL`), apontando para este
  repositório + a imagem/versão original acima.
- Nome e logo do Postiz/Robô MultiPost não são licenciados pela AGPL; por isso a marca foi trocada.
- Antes de comercializar para terceiros, vale uma revisão com advogado.

## Limites conhecidos

- Textos em outros idiomas continuam existindo no app; a interface está pensada para **português**.
- Não dá para reorganizar telas (só cores, textos, imagens e CSS), porque não recompilamos o app.
- Ao atualizar a versão do app original, os padrões do script podem deixar de casar: rode o teste local antes de publicar.
