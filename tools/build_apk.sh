#!/usr/bin/env bash
# 用 Android SDK Build-Tools 和 JDK 17+ 打包离线安卓应用。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AND="$ROOT/android"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
JAR="$SDK/platforms/android-${ANDROID_COMPILE_SDK:-35}/android.jar"
BT="$SDK/build-tools/${ANDROID_BUILD_TOOLS:-35.0.0}"
PYTHON="${PYTHON:-python3}"
JAVAC=javac
KEYTOOL=keytool
if [ -n "${JAVA_HOME:-}" ]; then
  JAVAC="$JAVA_HOME/bin/javac"
  KEYTOOL="$JAVA_HOME/bin/keytool"
fi

case "${1:---test}" in
  --test)
    APK="$ROOT/dist/xiantu-test.apk"
    KS="$HOME/.android/debug.keystore"
    ALIAS=androiddebugkey
    XIANMEN_APK_PASS=android
    ;;
  --release)
    APK="$ROOT/dist/xiantu.apk"
    KS="${KEYSTORE:-$AND/release.keystore}"
    ALIAS="${KEYSTORE_ALIAS:-xiantu}"
    XIANMEN_APK_PASS="${KEYSTORE_PASS:-xiantu-feichai}"
    if [ ! -f "$KS" ]; then
      echo "正式签名文件不存在：$KS" >&2
      exit 1
    fi
    ;;
  *)
    echo "用法：$0 [--test|--release]" >&2
    exit 2
    ;;
esac
export XIANMEN_APK_PASS

OUT="$(mktemp -d "${TMPDIR:-/tmp}/xianmen-apk.XXXXXX")"
trap 'rm -rf "$OUT"' EXIT
mkdir -p "$OUT/gen" "$OUT/obj" "$OUT/assets"
MANIFEST="$AND/AndroidManifest.xml"
if [ "${1:---test}" = "--test" ]; then
  MANIFEST="$OUT/AndroidManifest.xml"
  sed 's|@string/app_name|废柴仙途·测试|' "$AND/AndroidManifest.xml" > "$MANIFEST"
  PACKAGE_ARGS=(--rename-manifest-package com.xiantu.feichai.test)
  if [ ! -f "$KS" ]; then
    mkdir -p "$(dirname "$KS")"
    "$KEYTOOL" -genkeypair -keystore "$KS" -storepass android -keypass android -alias "$ALIAS" \
      -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug, O=Android, C=US"
  fi
else
  # Keep the resource package and application id from the release manifest.
  PACKAGE_ARGS=()
fi

"$PYTHON" "$ROOT/tools/build.py"
cp "$ROOT/dist/index.html" "$OUT/assets/index.html"

"$BT/aapt" package -f -m -J "$OUT/gen" -M "$MANIFEST" -S "$AND/res" \
  -A "$OUT/assets" -I "$JAR" -F "$OUT/app.unsigned.apk" ${PACKAGE_ARGS[@]+"${PACKAGE_ARGS[@]}"}
"$JAVAC" -nowarn --release 8 -encoding UTF-8 -classpath "$JAR" -d "$OUT/obj" \
  "$AND/src/com/xiantu/feichai/MainActivity.java" "$OUT/gen/com/xiantu/feichai/R.java"
(
  cd "$OUT/obj"
  jar cf "$OUT/classes.jar" com
)
"$BT/d8" --lib "$JAR" --min-api 21 --output "$OUT" "$OUT/classes.jar"
(cd "$OUT" && "$BT/aapt" add app.unsigned.apk classes.dex >/dev/null)
"$BT/zipalign" -f 4 "$OUT/app.unsigned.apk" "$OUT/app.aligned.apk"
"$BT/apksigner" sign --v4-signing-enabled false --ks "$KS" \
  --ks-pass env:XIANMEN_APK_PASS --ks-key-alias "$ALIAS" --out "$OUT/app.signed.apk" "$OUT/app.aligned.apk"
"$BT/apksigner" verify --verbose "$OUT/app.signed.apk"
if [ "${1:---test}" = "--release" ] && [ -f "$APK" ]; then
  signing_digest() {
    "$BT/apksigner" verify --print-certs "$1" | sed -n 's/^Signer #[0-9]* certificate SHA-256 digest: //p'
  }
  old_digest="$(signing_digest "$APK")"
  new_digest="$(signing_digest "$OUT/app.signed.apk")"
  if [ -z "$old_digest" ] || [ "$old_digest" != "$new_digest" ]; then
    echo "正式包签名与现有 APK 不一致，无法覆盖安装。" >&2
    exit 1
  fi
fi
mv "$OUT/app.signed.apk" "$APK"
ls -lh "$APK"
