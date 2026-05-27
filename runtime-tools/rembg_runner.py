import argparse
import os
import sys
from pathlib import Path

from rembg import remove, new_session


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def run_single(input_file: Path, output_file: Path, model: str) -> int:
    if not input_file.exists():
        print(f"input file not found: {input_file}", file=sys.stderr)
        return 1

    ensure_parent(output_file)

    session = new_session(model)

    with input_file.open("rb") as f:
        input_bytes = f.read()

    output_bytes = remove(input_bytes, session=session)

    with output_file.open("wb") as f:
        f.write(output_bytes)

    print(f"processed: {input_file} -> {output_file}")
    return 0


def run_batch(input_dir: Path, output_dir: Path, model: str) -> int:
    if not input_dir.exists() or not input_dir.is_dir():
        print(f"input dir not found: {input_dir}", file=sys.stderr)
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(
        [p for p in input_dir.iterdir() if p.is_file() and p.suffix.lower() == ".png"],
        key=lambda p: p.name.lower(),
    )

    if not files:
        print(f"no png files in input dir: {input_dir}", file=sys.stderr)
        return 1

    session = new_session(model)

    processed = 0

    for input_file in files:
        output_file = output_dir / input_file.name

        try:
            with input_file.open("rb") as f:
                input_bytes = f.read()

            output_bytes = remove(input_bytes, session=session)

            with output_file.open("wb") as f:
                f.write(output_bytes)

            processed += 1
            print(f"processed {processed}/{len(files)}: {input_file.name}")
        except Exception as error:
            print(f"failed: {input_file.name}: {error}", file=sys.stderr)
            return 1

    print(f"batch processed: {processed}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Sequence Cutout Studio rembg runner")
    parser.add_argument("mode", choices=["i", "p"])
    parser.add_argument("--model", default="isnet-general-use")
    parser.add_argument("input")
    parser.add_argument("output")

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if args.mode == "i":
        return run_single(input_path, output_path, args.model)

    return run_batch(input_path, output_path, args.model)


if __name__ == "__main__":
    raise SystemExit(main())