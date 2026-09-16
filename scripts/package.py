"""Archive the last committed source revision, without local files or credentials."""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
output = root / "dist" / "rave-board-source.zip"
output.parent.mkdir(exist_ok=True)
subprocess.run(
    ["git", "archive", "--format=zip", "--prefix=rave-board/", "--output", str(output), "HEAD"],
    cwd=root,
    check=True,
)
print(f"Packaged committed source: {output}")
