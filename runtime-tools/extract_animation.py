"""Decode GIF/WebP display frames, retaining timing and full RGBA transparency."""

import argparse
import json
from pathlib import Path

from PIL import Image


def extract_animation(source, output_dir, prefix):
    if not prefix or Path(prefix).name != prefix or any(c in prefix for c in '/\\:'):
        raise ValueError('Invalid output prefix')
    source = Path(source)
    output_dir = Path(output_dir)
    with Image.open(source) as animation:
        if animation.format not in ('GIF', 'WEBP'):
            raise ValueError('Input is not a GIF or WebP file')
        kind = animation.format.lower()
        # A new directory avoids mixing frames with earlier extractions.
        output_dir.mkdir(parents=True, exist_ok=False)
        frames = []
        loop = animation.info.get('loop')
        for index in range(animation.n_frames):
            animation.seek(index)
            name = f'{prefix}_{index + 1:04d}.png'
            # Pillow composes display frames; WebP timing is populated during load.
            frame = animation.convert('RGBA')
            duration = animation.info.get('duration', 0)
            frame.save(output_dir / name)
            frames.append({'fileName': name, 'durationMs': duration})
        manifest = {'version': 1, 'kind': kind, 'loop': loop, 'frames': frames}
        (output_dir / f'{kind}-timing.json').write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8'
        )
        return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('output_dir')
    parser.add_argument('prefix')
    args = parser.parse_args()
    result = extract_animation(args.source, args.output_dir, args.prefix)
    print(f"{result['kind'].upper()} extracted: {len(result['frames'])} frames")
