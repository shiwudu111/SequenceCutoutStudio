import importlib.util
import json
import tempfile
import unittest
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('animation_decoder', ROOT / 'runtime-tools/extract_animation.py')
decoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(decoder)


def make_gif(target, disposal=2):
    frames = []
    for index in range(4):
        frame = Image.new('P', (320, 240), 0)
        frame.putpalette([0, 0, 0, 240, 60, 80, 30, 180, 140] + [0] * 759)
        ImageDraw.Draw(frame).rectangle((30 + index * 40, 60, 55 + index * 40, 150), fill=1 + index % 2)
        frames.append(frame)
    frames[0].save(target, save_all=True, append_images=frames[1:],
                   transparency=0, duration=[50, 120, 200, 80], loop=0,
                   disposal=disposal, optimize=False)
    return frames


class GifTests(unittest.TestCase):
    def test_transparency_timing_disposal_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for disposal in (1, 2, 3):
                source = root / f'disposal-{disposal}.gif'
                make_gif(source, disposal)
                output = root / f'frames-{disposal}'
                result = decoder.extract_animation(source, output, 'frame')
                self.assertEqual([f['durationMs'] for f in result['frames']], [50, 120, 200, 80])
                self.assertEqual(result['loop'], 0)
                self.assertEqual(len(list(output.glob('*.png'))), 4)
                for index in range(4):
                    with Image.open(output / f'frame_{index + 1:04d}.png') as frame:
                        self.assertEqual(frame.size, (320, 240))
                        self.assertEqual(frame.getpixel((0, 0))[3], 0)
                        self.assertEqual(frame.getpixel((40 + index * 40, 90))[3], 255)
                        if index and disposal == 2:
                            self.assertEqual(frame.getpixel((40 + (index - 1) * 40, 90))[3], 0)
                        if index > 1 and disposal == 3:
                            self.assertEqual(frame.getpixel((40 + (index - 1) * 40, 90))[3], 0)
                        if disposal == 1:
                            self.assertEqual(frame.getpixel((40, 90))[3], 255)
                self.assertEqual(json.loads((output / 'gif-timing.json').read_text()), result)
                with self.assertRaises(FileExistsError):
                    decoder.extract_animation(source, output, 'frame')

    def test_static_and_invalid_gif(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            Image.new('RGB', (4, 4), 'red').save(root / 'static.gif')
            result = decoder.extract_animation(root / 'static.gif', root / 'frames', 'single')
            self.assertEqual(len(result['frames']), 1)
            self.assertEqual(result['frames'][0]['durationMs'], 0)
            Image.new('RGB', (4, 4)).save(root / 'wrong.png')
            with self.assertRaises(ValueError):
                decoder.extract_animation(root / 'wrong.png', root / 'wrong', 'single')


if __name__ == '__main__':
    fixture_dir = ROOT / 'release/preview-iteration-check'
    fixture_dir.mkdir(parents=True, exist_ok=True)
    make_gif(fixture_dir / 'sample.gif')
    unittest.main()
