from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
COMPARE_ROOT = ROOT / "release" / "phase-6e-2-preset-compare"
OUTPUT_ROOT = ROOT / "release" / "phase-6e-3-preset-contact-sheets"
TEST_ROOT = Path(r"E:\cuts\test")

VARIANTS = [
    ("original", "original"),
    ("raw", "raw"),
    ("detail_keep", "detail keep"),
    ("soft_c", "soft C"),
    ("balanced_f", "balanced F"),
    ("clean_i", "clean I"),
]

DEFAULT_FRAMES = ["sample_0001.png", "sample_0012.png", "sample_0024.png", "sample_0036.png", "sample_0048.png"]
SPECIAL_FRAMES = {
    "10": ["sample_0001.png", "sample_0024.png", "sample_0025.png", "sample_0030.png", "sample_0048.png"],
}

CELL_W = 220
CELL_H = 220
LABEL_H = 34
ROW_LABEL_W = 132
GAP = 12
PAD = 18
CHECK = 16


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\msyh.ttc"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


FONT = load_font(15)
SMALL_FONT = load_font(12)


def checkerboard(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGB", size, (238, 242, 248))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], CHECK):
        for x in range(0, size[0], CHECK):
            if ((x // CHECK) + (y // CHECK)) % 2:
                draw.rectangle((x, y, x + CHECK - 1, y + CHECK - 1), fill=(205, 214, 226))
    return image


def fit_image(path: Path, size: tuple[int, int], transparent_bg: bool) -> Image.Image:
    bg = checkerboard(size) if transparent_bg else Image.new("RGB", size, (244, 246, 250))
    if not path.exists():
        draw = ImageDraw.Draw(bg)
        draw.text((16, size[1] // 2 - 8), "missing", fill=(180, 60, 60), font=FONT)
        return bg

    source = Image.open(path).convert("RGBA")
    source.thumbnail((size[0] - 12, size[1] - 12), Image.Resampling.LANCZOS)
    x = (size[0] - source.width) // 2
    y = (size[1] - source.height) // 2
    bg.paste(source, (x, y), source)
    return bg


def sample_prefix(sample_name: str) -> str:
    return sample_name[:2]


def find_original_dir(sample_name: str) -> Path:
    prefix = sample_prefix(sample_name)
    candidates = sorted(p for p in TEST_ROOT.glob(f"{prefix}*_12fps_4s") if p.is_dir() and "raw" not in p.name.lower())
    if not candidates:
        raise FileNotFoundError(f"Original sample dir not found for {sample_name}")
    return candidates[0]


def find_raw_dir(sample_name: str) -> Path:
    prefix = sample_prefix(sample_name)
    candidates = sorted(p for p in TEST_ROOT.glob(f"{prefix}*_general_raw*") if p.is_dir())
    if not candidates:
        raise FileNotFoundError(f"Raw sample dir not found for {sample_name}")
    return candidates[0]


def image_path(sample_dir: Path, original_dir: Path, raw_dir: Path, variant: str, frame: str) -> Path:
    if variant == "original":
        return original_dir / frame
    if variant == "raw":
        return raw_dir / frame
    return sample_dir / variant / frame


def selected_frames(sample_name: str, sample_dir: Path) -> list[str]:
    frames = SPECIAL_FRAMES.get(sample_prefix(sample_name), DEFAULT_FRAMES)
    available = []
    for frame in frames:
        if (sample_dir / "clean_i" / frame).exists():
            available.append(frame)
    return available


def build_sheet(sample: dict[str, object]) -> Path:
    sample_name = str(sample["name"])
    sample_dir = COMPARE_ROOT / sample_name
    original_dir = Path(str(sample.get("originalDir") or find_original_dir(sample_name)))
    raw_dir = Path(str(sample.get("rawDir") or find_raw_dir(sample_name)))
    frames = selected_frames(sample_name, sample_dir)
    if not frames:
        raise RuntimeError(f"No frames found for {sample_name}")

    width = PAD * 2 + ROW_LABEL_W + len(VARIANTS) * CELL_W + (len(VARIANTS) - 1) * GAP
    height = PAD * 2 + LABEL_H + len(frames) * (CELL_H + LABEL_H) + (len(frames) - 1) * GAP
    sheet = Image.new("RGB", (width, height), (250, 251, 253))
    draw = ImageDraw.Draw(sheet)

    title = f"{sample_name} preset comparison"
    draw.text((PAD, PAD - 4), title, fill=(31, 48, 71), font=FONT)

    x0 = PAD + ROW_LABEL_W
    y0 = PAD + LABEL_H
    for col, (_, label) in enumerate(VARIANTS):
        x = x0 + col * (CELL_W + GAP)
        draw.text((x + 4, PAD - 4), label, fill=(31, 48, 71), font=FONT)

    for row, frame in enumerate(frames):
        y = y0 + row * (CELL_H + LABEL_H + GAP)
        draw.text((PAD, y + 8), frame, fill=(31, 48, 71), font=SMALL_FONT)
        for col, (variant, _) in enumerate(VARIANTS):
            x = x0 + col * (CELL_W + GAP)
            path = image_path(sample_dir, original_dir, raw_dir, variant, frame)
            cell = fit_image(path, (CELL_W, CELL_H), transparent_bg=variant != "original")
            sheet.paste(cell, (x, y))
            draw.rectangle((x, y, x + CELL_W - 1, y + CELL_H - 1), outline=(214, 224, 238), width=1)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_ROOT / f"{sample_name}.png"
    sheet.save(output)
    return output


def main() -> None:
    summary_path = COMPARE_ROOT / "summary.json"
    if not summary_path.exists():
        raise FileNotFoundError(summary_path)

    with summary_path.open("r", encoding="utf-8-sig") as handle:
        summary = json.load(handle)

    outputs: list[Path] = []
    for sample in summary.get("samples", []):
        outputs.append(build_sheet(sample))

    index_path = OUTPUT_ROOT / "contact_sheet_index.md"
    with index_path.open("w", encoding="utf-8") as handle:
        handle.write("# Phase 6E-3 Preset Contact Sheets\n\n")
        handle.write("Columns: original, raw, detail_keep, soft_c, balanced_f, clean_i.\n\n")
        for output in outputs:
            handle.write(f"- `{output.name}`\n")

    print(f"generated={len(outputs)}")
    print(f"output={OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
