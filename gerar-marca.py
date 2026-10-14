"""Gera os arquivos de marca do Autopublic (logo, favicon) a partir do aviãozinho de papel aprovado.
Uso: python -I gerar-marca.py <pasta-assets>
Saídas: autopublic-mark.svg, autopublic-lockup-light.png, autopublic-lockup-dark.png,
        favicon.png, favicon.ico, apple-touch-icon.png"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

pasta = sys.argv[1]
os.makedirs(pasta, exist_ok=True)

FONTE = next((c for c in (r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf") if os.path.exists(c)), None)

# Aviãozinho de papel (quadro de 1024): duas faces
NARIZ, ASA, DOBRA, CAUDA = (800, 230), (230, 470), (430, 570), (520, 810)
TINTA = (16, 17, 20)


def ouro(mask, y0, y1, claro, escuro, size):
    grad = Image.new("RGB", size)
    d = ImageDraw.Draw(grad)
    for y in range(size[1]):
        t = min(max((y - y0) / max(1, (y1 - y0)), 0), 1)
        d.line([(0, y), (size[0], y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(claro, escuro)))
    camada = Image.new("RGBA", size, (0, 0, 0, 0))
    camada.paste(grad, (0, 0), mask)
    return camada


def poligono(pontos, size):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(pontos, fill=255)
    return m


def aviao(size, altura, x0, y0):
    """Desenha o aviãozinho numa camada RGBA do tamanho `size`; ocupa `altura` px, canto sup. esq. em (x0, y0)."""
    esc = altura / 580.0  # a altura útil do desenho original é 810-230
    T = lambda p: (x0 + (p[0] - 230) * esc, y0 + (p[1] - 230) * esc)
    p1 = poligono([T(NARIZ), T(ASA), T(DOBRA)], size)
    p2 = poligono([T(NARIZ), T(DOBRA), T(CAUDA)], size)
    ya, yb = y0, y0 + altura
    camada = Image.new("RGBA", size, (0, 0, 0, 0))
    camada = Image.alpha_composite(camada, ouro(p1, ya, yb, (252, 240, 190), (222, 184, 70), size))
    camada = Image.alpha_composite(camada, ouro(p2, ya, yb, (214, 176, 60), (150, 112, 18), size))
    larg = (800 - 230) * esc
    return camada, larg


def lockup(arquivo, cor_auto, ouro_claro, ouro_escuro):
    W, H, S = 1620, 333, 4
    size = (W * S, H * S)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    alt = int(H * S * 0.86)
    y0 = (size[1] - alt) // 2
    plano, larg = aviao(size, alt, int(0.02 * W * S), y0)
    img = Image.alpha_composite(img, plano)
    fonte = ImageFont.truetype(FONTE, int(H * S * 0.66))
    x = int(0.02 * W * S + larg + 0.04 * W * S)
    base_y = int(size[1] * 0.70)
    d = ImageDraw.Draw(img)
    d.text((x, base_y), "Auto", font=fonte, fill=cor_auto + (255,), anchor="ls")
    x2 = x + fonte.getlength("Auto")
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).text((x2, base_y), "Public", font=fonte, fill=255, anchor="ls")
    img = Image.alpha_composite(img, ouro(m, int(base_y - H * S * 0.5), base_y, ouro_claro, ouro_escuro, size))
    img.resize((W, H), Image.LANCZOS).save(os.path.join(pasta, arquivo), "PNG", optimize=True)


def icone(tam):
    """Ícone quadrado: fundo escuro arredondado + aviãozinho dourado."""
    S = 4
    n = tam * S
    base = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    fundo = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(fundo).rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=(14, 15, 18, 255))
    base = Image.alpha_composite(base, fundo)
    alt = int(n * 0.58)
    larg_real = (800 - 230) / 580.0 * alt
    x0 = int((n - larg_real) / 2)
    y0 = int((n - alt) / 2)
    plano, _ = aviao((n, n), alt, x0, y0)
    base = Image.alpha_composite(base, plano)
    return base.resize((tam, tam), Image.LANCZOS)


# --- logos com nome (tema claro: "Auto" escuro; tema escuro: "Auto" branco)
lockup("autopublic-lockup-light.png", TINTA, (205, 165, 45), (150, 112, 18))
lockup("autopublic-lockup-dark.png", (255, 255, 255), (247, 231, 170), (205, 165, 45))

# --- favicon / ícone do app
icone(512).save(os.path.join(pasta, "favicon.png"), "PNG", optimize=True)
icone(180).save(os.path.join(pasta, "apple-touch-icon.png"), "PNG", optimize=True)
icone(256).save(os.path.join(pasta, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

# --- símbolo vetorial (usado no menu lateral)
svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="215 215 600 610">
<defs>
<linearGradient id="a" gradientUnits="userSpaceOnUse" x1="0" y1="230" x2="0" y2="810"><stop offset="0" stop-color="#fcf0be"/><stop offset="1" stop-color="#deb846"/></linearGradient>
<linearGradient id="b" gradientUnits="userSpaceOnUse" x1="0" y1="230" x2="0" y2="810"><stop offset="0" stop-color="#d6b03c"/><stop offset="1" stop-color="#967012"/></linearGradient>
</defs>
<polygon points="800,230 230,470 430,570" fill="url(#a)"/>
<polygon points="800,230 430,570 520,810" fill="url(#b)"/>
</svg>
"""
with open(os.path.join(pasta, "autopublic-mark.svg"), "w", encoding="utf-8") as f:
    f.write(svg)
print("ok", pasta)
