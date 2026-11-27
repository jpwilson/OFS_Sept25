#!/bin/zsh
# Usage: ./run.sh <batch> [people|none|kitchen] [extra -i files relative to raw/...]
# Runs one Codex image session from landing-art/raw/.
cd "$(dirname "$0")/raw" || exit 1
b=$1; mode=${2:-people}; shift 2 2>/dev/null
extra=()
for f in "$@"; do extra+=(-i "$f"); done
if [[ $mode == people ]]; then
  cat ../prompts/_preamble.md ../prompts/_cast.md ../prompts/$b.md | ai codex main exec --skip-git-repo-check -s workspace-write -i ../ref/cast-a.png -i ../ref/cast-b.png "${extra[@]}" -o _$b.last.txt - > _$b.log 2>&1
elif [[ $mode == kitchen ]]; then
  cat ../prompts/_preamble.md ../prompts/$b.md | ai codex main exec --skip-git-repo-check -s workspace-write -i look_kitchen_done.png -o _$b.last.txt - > _$b.log 2>&1
else
  cat ../prompts/_preamble.md ../prompts/$b.md | ai codex main exec --skip-git-repo-check -s workspace-write "${extra[@]}" -o _$b.last.txt - > _$b.log 2>&1
fi
echo "done $b exit $?"
