#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_dir="$project_dir/build"

if [ -d "$output_dir" ]; then
  find "$output_dir" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
else
  mkdir -p "$output_dir"
fi

cp "$project_dir/index.html" "$output_dir/index.html"
cp "$project_dir/styles.css" "$output_dir/styles.css"
cp "$project_dir/app.js" "$output_dir/app.js"
cp -R "$project_dir/src" "$output_dir/src"

echo "Built Orbit in $output_dir"
