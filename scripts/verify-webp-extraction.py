"""Test RGBA/timing retention, optionally checking a supplied real WebP."""

import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('animation_decoder', ROOT / 'runtime-tools/extract_animation.py')
decoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(decoder)


def make_webp(target):
    frames = []
    for index in range(4):
        frame = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        ImageDraw.Draw(frame).rectangle((index * 12, 12, index * 12 + 10, 40),
                                        fill=(240, 80, 40, 40 + index * 60))
        frames.append(frame)
    frames[0].save(target, save_all=True, append_images=frames[1:], lossless=True,
                   duration=[30, 70, 110, 190], loop=2)
    return frames


def verify_source(source, output):
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    manifest = decoder.extract_animation(source, output, 'frame')
    assert manifest['kind'] == 'webp'
    assert len(list(output.glob('*.png'))) == len(manifest['frames'])
    details = []
    with Image.open(source) as animation:
        assert len(manifest['frames']) == animation.n_frames
        for index, entry in enumerate(manifest['frames']):
            animation.seek(index)
            expected = animation.convert('RGBA')
            with Image.open(output / entry['fileName']) as actual:
                assert actual.mode == 'RGBA'
                assert actual.size == expected.size
                assert actual.tobytes() == expected.tobytes(), f'RGBA mismatch at frame {index + 1}'
            assert entry['durationMs'] == animation.info.get('duration', 0)
            histogram = expected.getchannel('A').histogram()
            details.append({'frame': index + 1, 'durationMs': entry['durationMs'],
                            'transparent': histogram[0], 'partial': sum(histogram[1:255]),
                            'opaque': histogram[255]})
        size = animation.size
    assert hashlib.sha256(source.read_bytes()).hexdigest() == before
    assert json.loads((output / 'webp-timing.json').read_text()) == manifest
    return {'source': str(source), 'sha256': before, 'size': size, 'frames': details,
            'rgbaExactMatch': True, 'sourceUnchanged': True, 'output': str(output)}


class WebPTests(unittest.TestCase):
    def test_animation_rgba_timing_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            original = make_webp(root / 'animation.WEBP')
            report = verify_source(root / 'animation.WEBP', root / 'frames')
            self.assertEqual([f['durationMs'] for f in report['frames']], [30, 70, 110, 190])
            for index, expected in enumerate(original):
                with Image.open(root / 'frames' / f'frame_{index + 1:04d}.png') as actual:
                    self.assertEqual(actual.getchannel('A').tobytes(), expected.getchannel('A').tobytes())
            with self.assertRaises(FileExistsError):
                decoder.extract_animation(root / 'animation.WEBP', root / 'frames', 'frame')

    def test_static_webp(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            Image.new('RGBA', (8, 8), (20, 40, 60, 128)).save(root / 'static.webp', lossless=True)
            report = verify_source(root / 'static.webp', root / 'frames')
            self.assertEqual(len(report['frames']), 1)
            self.assertEqual(report['frames'][0]['partial'], 64)


if __name__ == '__main__':
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    fixture_dir = ROOT / 'release/preview-iteration-check'
    fixture_dir.mkdir(parents=True, exist_ok=True)
    make_webp(fixture_dir / 'sample.webp')
    result = unittest.main(argv=[sys.argv[0]], exit=False).result
    if not result.wasSuccessful():
        sys.exit(1)
    if source:
        from datetime import datetime
        output = fixture_dir / ('webp-user-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
        report = verify_source(source, output)
        (fixture_dir / 'webp-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps(report, indent=2))
