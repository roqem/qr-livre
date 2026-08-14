#!/usr/bin/env python3
"""Gera QR Codes estáticos em PNG e SVG sem usar serviços externos."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import qrcode
from qrcode.constants import (
    ERROR_CORRECT_H,
    ERROR_CORRECT_L,
    ERROR_CORRECT_M,
    ERROR_CORRECT_Q,
)
from qrcode.image.svg import SvgPathFillImage

ERROR_LEVELS = {
    "L": ERROR_CORRECT_L,
    "M": ERROR_CORRECT_M,
    "Q": ERROR_CORRECT_Q,
    "H": ERROR_CORRECT_H,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera um QR estático em PNG e SVG a partir de qualquer texto."
    )
    parser.add_argument("texto", help="URL ou texto que será codificado")
    parser.add_argument(
        "-o",
        "--saida",
        default="qr_code",
        help="nome base dos arquivos de saída (padrão: qr_code)",
    )
    parser.add_argument(
        "-e",
        "--erro",
        choices=ERROR_LEVELS,
        default="H",
        help="nível de correção de erros: L, M, Q ou H (padrão: H)",
    )
    parser.add_argument(
        "--box-size",
        type=int,
        default=20,
        help="pixels por módulo no PNG (padrão: 20)",
    )
    return parser.parse_args()


def build_qr(texto: str, error_level: int, box_size: int) -> qrcode.QRCode:
    qr = qrcode.QRCode(
        version=None,
        error_correction=error_level,
        box_size=box_size,
        border=4,
    )
    qr.add_data(texto)
    qr.make(fit=True)
    return qr


def main() -> int:
    args = parse_args()
    if args.box_size < 1:
        print("Erro: --box-size deve ser maior que zero.", file=sys.stderr)
        return 2

    base = Path(args.saida).expanduser()
    png_path = base.with_suffix(".png")
    svg_path = base.with_suffix(".svg")
    png_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        qr = build_qr(args.texto, ERROR_LEVELS[args.erro], args.box_size)
        qr.make_image(fill_color="black", back_color="white").save(png_path)
        qr.make_image(image_factory=SvgPathFillImage).save(svg_path)
    except Exception as exc:  # informa erro de capacidade, escrita etc.
        print(f"Erro ao gerar QR: {exc}", file=sys.stderr)
        return 1

    print(f"PNG: {png_path.resolve()}")
    print(f"SVG: {svg_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
