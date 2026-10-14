"""Monta uma prévia local da tela de login usando o HTML REAL do app + o CSS/fontes já patchados.
Uso: python -I montar-previa-login.py <html-original> <pasta-trabalho-patchada> <pasta-saida>
Não toca na VPS; serve para ver o resultado antes de publicar."""
import os, re, shutil, sys

html_orig, trab, saida = sys.argv[1], sys.argv[2], sys.argv[3]
h = open(html_orig, encoding="utf-8").read()

# 1) painel da direita -> painel da marca (acha o </div> que fecha o painel contando aberturas/fechamentos)
ini = h.find('<div class="text-[36px] flex-1 pt-[88px]')
assert ini > 0, "painel não encontrado"
prof, i = 0, ini
for m in re.finditer(r"<div\b|</div>", h[ini:]):
    prof += 1 if m.group(0).startswith("<div") else -1
    if prof == 0:
        fim = ini + m.end()
        break
painel = ('<div class="autopublic-painel hidden lg:flex"><div class="autopublic-painel-marca"></div>'
          '<h2>Suas redes sociais, num só lugar.</h2>'
          '<p>Agende, publique e automatize respostas no Instagram e no Facebook.</p>'
          '__FONTE__</div>')
fonte = os.environ.get("FONTE_URL", "")
painel = painel.replace("__FONTE__", f'<a class="autopublic-fonte" href="{fonte}" target="_blank" rel="noopener noreferrer">Código-fonte (AGPL-3.0)</a>' if fonte else "")
h = h[:ini] + painel + h[fim:]

# 2) classes do container / cartão / formulário (mesmas trocas do patch)
h = h.replace("bg-[#0E0E0E] flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen text-white",
              "light autopublic-auth flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen")
h = h.replace("rounded-[12px] text-white p-[12px] bg-[#1A1919]", "rounded-[12px] p-[12px] autopublic-card")
h = h.replace("justify-center gap-[20px] h-full flex flex-col text-white", "justify-center gap-[20px] h-full flex flex-col")

# 3) sem scripts (prévia estática), CSS com o nome novo, título
h = re.sub(r"<script\b[^>]*>.*?</script>", "", h, flags=re.S)
h = re.sub(r'<link rel="preload"[^>]*>', "", h)
h = h.replace("3nyzzxxkjer-m.css", "3nyzzxxkjer-m-ap1.css")
h = re.sub(r"<title>.*?</title>", "<title>Autopublic · Entrar</title>", h)

# 4) pasta servida: html + _next/static + autopublic/
os.makedirs(saida, exist_ok=True)
open(os.path.join(saida, "login.html"), "w", encoding="utf-8").write(h)
dst = os.path.join(saida, "_next", "static")
if not os.path.exists(dst):
    shutil.copytree(os.path.join(trab, "next", "static"), dst)
dst2 = os.path.join(saida, "autopublic")
if not os.path.exists(dst2):
    shutil.copytree(os.path.join(trab, "public", "autopublic"), dst2)
print("ok:", os.path.join(saida, "login.html"))
