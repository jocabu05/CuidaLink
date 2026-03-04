#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from PIL import Image, ImageDraw, ImageFont
import os

def create_logo_variants():
    """Create multiple logo variants for CuidaLink"""
    
    # Crear carpeta para logos
    logo_dir = r"c:\Users\usuario\Desktop\TFG ALZHEIMER\assets\logos"
    os.makedirs(logo_dir, exist_ok=True)
    
    # ============ LOGO PRINCIPAL (512x512) ============
    img_main = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img_main)
    
    # Gradiente fondo (simulado con colores sólidos base)
    # Azul profundo a azul claro
    for i in range(512):
        r = int(30 + (14 - 30) * i / 512)
        g = int(58 + (165 - 58) * i / 512)
        b = int(138 + (233 - 138) * i / 512)
        draw.line([(0, i), (512, i)], fill=(r, g, b))
    
    # Círculos de conexión decorativos
    draw.ellipse([85, 105, 155, 175], outline=(56, 189, 248), width=2)
    draw.ellipse([357, 105, 427, 175], outline=(56, 189, 248), width=2)
    draw.ellipse([221, 345, 291, 415], outline=(56, 189, 248), width=2)
    
    # Líneas de conexión
    draw.line([(120, 140), (220, 200)], fill=(56, 189, 248), width=2)
    draw.line([(392, 140), (290, 200)], fill=(56, 189, 248), width=2)
    draw.line([(245, 260), (180, 330)], fill=(56, 189, 248), width=2)
    draw.line([(267, 260), (330, 330)], fill=(56, 189, 248), width=2)
    
    # Nodos (puntos blancos)
    draw.ellipse([108, 128, 132, 152], fill=(56, 189, 248))
    draw.ellipse([380, 128, 404, 152], fill=(56, 189, 248))
    draw.ellipse([244, 368, 268, 392], fill=(56, 189, 248))
    
    # CORAZÓN (rosa/rojo)
    # Dibujar corazón con dos círculos y triángulo
    heart_points = [
        (180, 200),  # punta inferior izquierda
        (200, 180),  # curva izquierda
        (220, 170),  # cúpula izquierda
        (240, 165),  # centro techo
        (256, 170),  # centro (donde se unen)
        (272, 165),  
        (292, 170),  
        (312, 180),  
        (332, 200),  # punta inferior derecha
        (310, 240),  
        (256, 290),  # punta inferior corazón
        (202, 240),  
    ]
    
    # Dibujar corazón relleno
    draw.polygon(heart_points, fill=(236, 72, 153), outline=(244, 63, 94))
    
    # Puntos esquinas
    draw.ellipse([92, 312, 108, 328], fill=(56, 189, 248))
    draw.ellipse([404, 312, 420, 328], fill=(56, 189, 248))
    
    # Guardar logo principal
    img_main.save(os.path.join(logo_dir, "cuidalink_logo_main.png"))
    print(f"✓ Logo principal creado: cuidalink_logo_main.png")
    
    # ============ LOGO ICONO (256x256) ============
    img_icon = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    draw_icon = ImageDraw.Draw(img_icon)
    
    # Fondo gradiente azul
    for i in range(256):
        r = int(30 + (14 - 30) * i / 256)
        g = int(58 + (165 - 58) * i / 256)
        b = int(138 + (233 - 138) * i / 256)
        draw_icon.line([(0, i), (256, i)], fill=(r, g, b))
    
    # Líneas de conexión (escala 50%)
    draw_icon.line([(60, 70), (110, 100)], fill=(56, 189, 248), width=1)
    draw_icon.line([(196, 70), (145, 100)], fill=(56, 189, 248), width=1)
    draw_icon.line([(122, 130), (90, 165)], fill=(56, 189, 248), width=1)
    draw_icon.line([(134, 130), (165, 165)], fill=(56, 189, 248), width=1)
    
    # Nodos
    draw_icon.ellipse([54, 64, 66, 76], fill=(56, 189, 248))
    draw_icon.ellipse([190, 64, 202, 76], fill=(56, 189, 248))
    draw_icon.ellipse([122, 184, 134, 196], fill=(56, 189, 248))
    
    # Corazón (escala 50%)
    heart_icon_points = [
        (90, 100),
        (100, 90),
        (110, 85),
        (120, 82),
        (128, 85),
        (136, 82),
        (146, 85),
        (156, 90),
        (166, 100),
        (155, 120),
        (128, 145),
        (101, 120),
    ]
    
    draw_icon.polygon(heart_icon_points, fill=(236, 72, 153), outline=(244, 63, 94))
    
    img_icon.save(os.path.join(logo_dir, "cuidalink_logo_icon.png"))
    print(f"✓ Logo icono creado: cuidalink_logo_icon.png")
    
    # ============ LOGO BLANCO (para fondo oscuro) ============
    img_white = Image.new('RGBA', (512, 512), (30, 58, 138, 0))
    draw_white = ImageDraw.Draw(img_white)
    
    # Círculos de conexión
    draw_white.ellipse([85, 105, 155, 175], outline=(255, 255, 255), width=2)
    draw_white.ellipse([357, 105, 427, 175], outline=(255, 255, 255), width=2)
    draw_white.ellipse([221, 345, 291, 415], outline=(255, 255, 255), width=2)
    
    # Líneas
    draw_white.line([(120, 140), (220, 200)], fill=(255, 255, 255), width=2)
    draw_white.line([(392, 140), (290, 200)], fill=(255, 255, 255), width=2)
    draw_white.line([(245, 260), (180, 330)], fill=(255, 255, 255), width=2)
    draw_white.line([(267, 260), (330, 330)], fill=(255, 255, 255), width=2)
    
    # Nodos
    draw_white.ellipse([108, 128, 132, 152], fill=(255, 255, 255))
    draw_white.ellipse([380, 128, 404, 152], fill=(255, 255, 255))
    draw_white.ellipse([244, 368, 268, 392], fill=(255, 255, 255))
    
    # Corazón rosa
    draw_white.polygon(heart_points, fill=(236, 72, 153), outline=(244, 63, 94))
    
    # Puntos esquinas
    draw_white.ellipse([92, 312, 108, 328], fill=(255, 255, 255))
    draw_white.ellipse([404, 312, 420, 328], fill=(255, 255, 255))
    
    img_white.save(os.path.join(logo_dir, "cuidalink_logo_white.png"))
    print(f"✓ Logo blanco creado: cuidalink_logo_white.png")
    
    # ============ FAVICON (64x64) ============
    img_favicon = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw_favicon = ImageDraw.Draw(img_favicon)
    
    # Fondo redondo azul
    for i in range(64):
        r = int(30 + (14 - 30) * i / 64)
        g = int(58 + (165 - 58) * i / 64)
        b = int(138 + (233 - 138) * i / 64)
        draw_favicon.line([(0, i), (64, i)], fill=(r, g, b))
    
    # Corazón pequeño centrado
    heart_favicon = [
        (22, 25),
        (28, 18),
        (32, 16),
        (36, 18),
        (42, 25),
        (38, 32),
        (32, 38),
        (26, 32),
    ]
    
    draw_favicon.polygon(heart_favicon, fill=(236, 72, 153), outline=(244, 63, 94))
    
    img_favicon.save(os.path.join(logo_dir, "cuidalink_favicon.ico"))
    print(f"✓ Favicon creado: cuidalink_favicon.ico")
    
    # Resumen
    print("\n" + "="*60)
    print("LOGOS CREADOS EXITOSAMENTE")
    print("="*60)
    print(f"\nUbicación: {logo_dir}\n")
    print("Archivos generados:")
    print("1. cuidalink_logo_main.png     (512x512) - Para documentos, web")
    print("2. cuidalink_logo_icon.png     (256x256) - Para app store, redes sociales")
    print("3. cuidalink_logo_white.png    (512x512) - Versión blanca (fondo oscuro)")
    print("4. cuidalink_favicon.ico        (64x64)  - Para navegador web")
    print("\nCaracterísticas del logo:")
    print("✓ Corazón rosa (cuidado, empatía)")
    print("✓ Nodos y líneas azules (conexión digital, red)")
    print("✓ Gradiente azul (confianza, seguridad)")
    print("✓ Diseño limpio y moderno")
    print("✓ Adaptable a cualquier tamaño")
    print("="*60)

if __name__ == "__main__":
    create_logo_variants()
