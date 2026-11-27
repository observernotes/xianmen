#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/godot"
NATIVE="$PROJECT/native"
PYTHON="${PYTHON:-python3}"
SCONS="${SCONS:-scons}"
GODOT_BIN="${GODOT_BIN:-godot}"
if ! command -v "$GODOT_BIN" >/dev/null && [ -x /Applications/Godot.app/Contents/MacOS/Godot ]; then
  GODOT_BIN=/Applications/Godot.app/Contents/MacOS/Godot
fi

case "$(uname -s)" in
  Darwin) platform=macos ;;
  Linux) platform=linux ;;
  *) echo "需要 macOS 或 Linux 构建环境" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  arm64|aarch64) architecture=arm64 ;;
  x86_64) architecture=x86_64 ;;
  *) echo "当前主机架构暂未配置" >&2; exit 1 ;;
esac

mkdir -p "$NATIVE/.deps" "$PROJECT/addons/xianmen_runtime/bin"
dep() {
  local name="$1" remote="$2" tag="$3" expected="$4" dir="$NATIVE/.deps/$1"
  if [ ! -d "$dir/.git" ]; then
    git clone --depth 1 --branch "$tag" "$remote" "$dir"
  fi
  if [ "$(git -C "$dir" rev-parse HEAD)" != "$expected" ]; then
    echo "$name 版本与构建要求不符：$dir" >&2
    exit 1
  fi
}
dep godot-cpp https://github.com/godotengine/godot-cpp.git godot-4.5-stable e83fd0904c13356ed1d4c3d09f8bb9132bdc6b77
dep quickjs https://github.com/quickjs-ng/quickjs.git v0.11.0 6a9fe9af5ca0bf7c49ae697edef44864272317d1
"$PYTHON" "$ROOT/tools/build_godot_data.py"

compile() {
  (
    cd "$NATIVE"
    "$SCONS" target=template_debug -j"${JOBS:-8}" "$@"
  )
}
compile platform="$platform" arch="$architecture"
"$GODOT_BIN" --headless --path "$PROJECT" --editor --import --quit
if ! check_output=$("$GODOT_BIN" --headless --path "$PROJECT" --check-only --script res://scripts/main.gd 2>&1); then
  printf '%s\n' "$check_output"
  exit 1
fi
printf '%s\n' "$check_output"
case "$check_output" in *"SCRIPT ERROR:"*) exit 1 ;; esac
if ! smoke_output=$("$GODOT_BIN" --headless --path "$PROJECT" --quit-after 600 --script res://tests/runtime_smoke.gd 2>&1); then
  printf '%s\n' "$smoke_output"
  exit 1
fi
printf '%s\n' "$smoke_output"
case "$smoke_output" in
  *"SCRIPT ERROR:"*) exit 1 ;;
  *"Godot native runtime:"*"passed"*) ;;
  *) exit 1 ;;
esac

if [ "${1:-}" = "--android" ]; then
  export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
  compile platform=android arch=arm64 ndk_version=28.1.13356709
  "$GODOT_BIN" --headless --path "$PROJECT" --export-debug Android "${2:-$ROOT/dist/xiantu-godot-preview.apk}"
fi
