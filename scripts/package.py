"""Package the source with an explicit allowlist; never ship host credentials."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
files = [root / 'README.md', root / 'package.json', root / '.gitignore']
for folder in ['site', 'scripts', 'test']:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file() and p.suffix != '.zip' and '__pycache__' not in p.parts)
with ZipFile(root / 'site/kilter-trip-source.zip', 'w', ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(path, Path('kilter-trip') / path.relative_to(root))
print(f'Packaged {len(files)} source files')
