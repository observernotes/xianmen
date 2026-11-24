#!/usr/bin/env bash
# 打包安卓 APK（离线单机）：javac → dx → aapt → zipalign → apksigner
# 依赖（Ubuntu）：apt install android-sdk-build-tools android-sdk-platform-23 apksigner zipalign default-jdk
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AND="$ROOT/android"
OUT="$AND/build"
SDK=/usr/lib/android-sdk
JAR="$SDK/platforms/android-23/android.jar"
BT="$SDK/build-tools/debian"
KS="${KEYSTORE:-$AND/release.keystore}"
KS_PASS="${KEYSTORE_PASS:-xiantu-feichai}"

python3 "$ROOT/tools/build.py"
rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/obj" "$AND/assets"
cp "$ROOT/dist/index.html" "$AND/assets/index.html"

# 资源与清单 → R.java + 未签名包
"$BT/aapt" package -f -m -J "$OUT/gen" -M "$AND/AndroidManifest.xml" -S "$AND/res" -A "$AND/assets" -I "$JAR" -F "$OUT/app.unsigned.apk"
# 编译 Java（Java 8 字节码，供 dx 转换）
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -classpath "$JAR" -d "$OUT/obj" \
  $(find "$AND/src" -name '*.java') $(find "$OUT/gen" -name '*.java')
# 转 dex 并加入包
"$BT/dx" --dex --min-sdk-version=21 --output="$OUT/classes.dex" "$OUT/obj"
(cd "$OUT" && "$BT/aapt" add app.unsigned.apk classes.dex >/dev/null)
# 对齐与签名
"$BT/zipalign" -f -p 4 "$OUT/app.unsigned.apk" "$OUT/app.aligned.apk"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -storepass "$KS_PASS" -keypass "$KS_PASS" -alias xiantu \
    -keyalg RSA -keysize 2048 -validity 36500 -dname "CN=Xiantu Feichai, O=Indie, C=CN" >/dev/null 2>&1
fi
"$BT/apksigner" sign --v4-signing-enabled false --ks "$KS" --ks-pass "pass:$KS_PASS" --ks-key-alias xiantu --out "$ROOT/dist/xiantu.apk" "$OUT/app.aligned.apk"
"$BT/apksigner" verify --verbose "$ROOT/dist/xiantu.apk" | head -5
ls -la "$ROOT/dist/xiantu.apk"
