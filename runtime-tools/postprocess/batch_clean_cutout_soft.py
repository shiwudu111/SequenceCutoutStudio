from PIL import Image, ImageFilter
from pathlib import Path
import numpy as np
import argparse
import json
import time


def estimate_bg_color(img):
    arr = np.array(img.convert("RGB"), dtype=np.float32)
    h, w, _ = arr.shape

    pad_x = max(8, w // 20)
    pad_y = max(8, h // 20)

    samples = [
        arr[0:pad_y, 0:pad_x].reshape(-1, 3),
        arr[0:pad_y, w - pad_x : w].reshape(-1, 3),
        arr[h - pad_y : h, 0:pad_x].reshape(-1, 3),
        arr[h - pad_y : h, w - pad_x : w].reshape(-1, 3),
    ]

    return np.concatenate(samples, axis=0).mean(axis=0)


def repair_edge_color(rgb_clean, alpha, strength):
    if strength <= 0:
        return 0

    solid_mask = alpha >= 240
    edge_mask = (alpha > 0.5) & (alpha < 220)

    if not solid_mask.any() or not edge_mask.any():
        return 0

    solid_rgb = np.where(solid_mask[..., None], rgb_clean, 0)
    solid_weight = solid_mask.astype(np.uint8) * 255

    solid_rgb_img = Image.fromarray(solid_rgb.clip(0, 255).astype(np.uint8), mode="RGB")
    solid_weight_img = Image.fromarray(solid_weight, mode="L")

    blurred_rgb = np.array(solid_rgb_img.filter(ImageFilter.GaussianBlur(radius=2.0)), dtype=np.float32)
    blurred_weight = np.array(
        solid_weight_img.filter(ImageFilter.GaussianBlur(radius=2.0)),
        dtype=np.float32,
    )

    valid_mask = edge_mask & (blurred_weight > 1)
    adjusted_count = int(valid_mask.sum())

    if adjusted_count == 0:
        return 0

    nearby_rgb = blurred_rgb * (255.0 / np.maximum(blurred_weight[..., None], 1.0))
    edge_amount = np.clip((220.0 - alpha) / 220.0, 0.0, 1.0) * strength
    edge_amount = edge_amount[..., None]

    rgb_clean[valid_mask] = (
        rgb_clean[valid_mask] * (1.0 - edge_amount[valid_mask])
        + nearby_rgb[valid_mask] * edge_amount[valid_mask]
    )

    return adjusted_count


def gentle_clean(original_path, cutout_path, output_path, alpha_low, shrink, edge_color_fix_strength):
    original = Image.open(original_path).convert("RGBA")
    cutout = Image.open(cutout_path).convert("RGBA")

    if original.size != cutout.size:
        raise ValueError(f"尺寸不一致：{original_path} {original.size} vs {cutout_path} {cutout.size}")

    orig_arr = np.array(original, dtype=np.float32)
    cut_arr = np.array(cutout, dtype=np.float32)

    rgb = orig_arr[..., :3].copy()
    alpha = cut_arr[..., 3].copy()

    alpha[alpha < alpha_low] = 0

    alpha_img = Image.fromarray(alpha.clip(0, 255).astype(np.uint8), mode="L")
    alpha_eroded = alpha_img.filter(ImageFilter.MinFilter(3))
    alpha_eroded = np.array(alpha_eroded, dtype=np.float32)

    alpha = alpha * (1.0 - shrink) + alpha_eroded * shrink

    alpha_img = Image.fromarray(alpha.clip(0, 255).astype(np.uint8), mode="L")
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.6))
    alpha = np.array(alpha_img, dtype=np.float32)

    bg = estimate_bg_color(original)
    a = np.clip(alpha / 255.0, 1e-6, 1.0)

    rgb_clean = rgb.copy()
    for c in range(3):
        rgb_clean[..., c] = (rgb[..., c] - bg[c] * (1.0 - a)) / a

    rgb_clean = np.clip(rgb_clean, 0, 255)

    mask0 = alpha <= 0.5
    rgb_clean[mask0] = 0
    fixed_edge_pixels = repair_edge_color(rgb_clean, alpha, edge_color_fix_strength)

    out = np.dstack([rgb_clean, alpha.clip(0, 255)])
    out = Image.fromarray(out.astype(np.uint8), mode="RGBA")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(output_path)
    return fixed_edge_pixels


def collect_pngs(path):
    path = Path(path)
    if path.is_file():
        return [path]
    return sorted(path.glob("*.png"))


def main():
    parser = argparse.ArgumentParser(description="Sequence Cutout Studio soft edge postprocess")
    parser.add_argument("--original", required=True, help="原始 PNG 文件或目录")
    parser.add_argument("--raw", required=True, help="rembg raw PNG 文件或目录")
    parser.add_argument("--output", required=True, help="输出 PNG 文件或目录")
    parser.add_argument("--alpha-low", type=int, default=48)
    parser.add_argument("--shrink", type=float, default=0.78)
    parser.add_argument("--edge-color-fix-strength", type=float, default=0.35)
    parser.add_argument("--disable-edge-color-fix", action="store_true")
    parser.add_argument("--log", default="")
    args = parser.parse_args()

    start = time.time()

    original_path = Path(args.original)
    raw_path = Path(args.raw)
    output_path = Path(args.output)

    if not original_path.exists():
        raise FileNotFoundError(f"找不到 original：{original_path}")
    if not raw_path.exists():
        raise FileNotFoundError(f"找不到 raw：{raw_path}")

    original_files = collect_pngs(original_path)
    processed = 0
    skipped = 0
    errors = []
    edge_color_fixed_pixels = 0
    edge_color_fix_strength = 0.0 if args.disable_edge_color_fix else args.edge_color_fix_strength

    if original_path.is_file():
        raw_file = raw_path
        out_file = output_path
        try:
            edge_color_fixed_pixels += gentle_clean(
                original_path,
                raw_file,
                out_file,
                args.alpha_low,
                args.shrink,
                edge_color_fix_strength,
            )
            processed += 1
        except Exception as e:
            errors.append(str(e))
    else:
        output_path.mkdir(parents=True, exist_ok=True)

        for original_file in original_files:
            raw_file = raw_path / original_file.name
            out_file = output_path / original_file.name

            if not raw_file.exists():
                skipped += 1
                errors.append(f"跳过，找不到 raw：{raw_file}")
                continue

            try:
                edge_color_fixed_pixels += gentle_clean(
                    original_file,
                    raw_file,
                    out_file,
                    args.alpha_low,
                    args.shrink,
                    edge_color_fix_strength,
                )
                processed += 1
            except Exception as e:
                skipped += 1
                errors.append(f"{original_file.name}: {e}")

    result = {
        "processed": processed,
        "skipped": skipped,
        "errors": errors,
        "alphaLow": args.alpha_low,
        "shrink": args.shrink,
        "edgeColorFix": not args.disable_edge_color_fix,
        "edgeColorFixStrength": edge_color_fix_strength,
        "edgeColorFixedPixels": edge_color_fixed_pixels,
        "elapsedSeconds": round(time.time() - start, 3),
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))

    if args.log:
        log_path = Path(args.log)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
