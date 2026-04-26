#!/bin/bash
# Build native libraries for Android (run ONCE with Android NDK installed)
# After running, the .so files are placed in jniLibs/ and anyone can build
# the Android app without NDK, CMake, or C++ knowledge.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR"
ANDROID_DIR="$PLUGIN_DIR/android"
CPP_DIR="$ANDROID_DIR/src/main/cpp"
JNI_LIBS_DIR="$ANDROID_DIR/src/main/jniLibs"

# Check for Android NDK
if [ -z "$ANDROID_NDK_HOME" ] && [ -z "$ANDROID_NDK" ]; then
    echo "ERROR: ANDROID_NDK_HOME or ANDROID_NDK environment variable not set"
    echo ""
    echo "Install Android NDK via Android Studio:"
    echo "  Tools -> SDK Manager -> SDK Tools -> NDK (Side by side)"
    echo ""
    echo "Then set the environment variable, e.g.:"
    echo "  export ANDROID_NDK_HOME=\$HOME/Android/Sdk/ndk/25.2.9519653"
    exit 1
fi

NDK="${ANDROID_NDK_HOME:-$ANDROID_NDK}"

if [ ! -f "$NDK/build/cmake/android.toolchain.cmake" ]; then
    echo "ERROR: NDK CMake toolchain not found at $NDK"
    exit 1
fi

echo "Using NDK: $NDK"

# Clone llama.cpp if needed
if [ ! -d "$CPP_DIR/llama.cpp" ]; then
    echo ""
    echo "Cloning llama.cpp..."
    git clone --depth 1 --branch b4000 https://github.com/ggerganov/llama.cpp.git "$CPP_DIR/llama.cpp"
fi

ABIS=("arm64-v8a" "armeabi-v7a" "x86_64")
API_LEVEL=24

echo ""
echo "Building liblocal-llm-jni.so for ${#ABIS[@]} architectures..."
echo "This will take 2-5 minutes. Grab a coffee ☕"
echo ""

for ABI in "${ABIS[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Building for: $ABI"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    BUILD_DIR="$CPP_DIR/build-$ABI"
    mkdir -p "$BUILD_DIR"

    cmake -S "$CPP_DIR" -B "$BUILD_DIR" \
        -DCMAKE_TOOLCHAIN_FILE="$NDK/build/cmake/android.toolchain.cmake" \
        -DANDROID_ABI="$ABI" \
        -DANDROID_PLATFORM="android-$API_LEVEL" \
        -DANDROID_STL=c++_shared \
        -DCMAKE_BUILD_TYPE=Release \
        -DLLAMA_CPP_DIR="$CPP_DIR/llama.cpp" \
        -DLLAMA_NATIVE=OFF \
        -DLLAMA_AVX=OFF \
        -DLLAMA_AVX2=OFF \
        -DLLAMA_FMA=OFF \
        -DLLAMA_F16C=OFF \
        -DLLAMA_OPENMP=OFF \
        -DLLAMA_BUILD_SERVER=OFF \
        -DLLAMA_BUILD_TESTS=OFF \
        -DLLAMA_BUILD_EXAMPLES=OFF

    cmake --build "$BUILD_DIR" --config Release -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)"

    # Copy to jniLibs
    mkdir -p "$JNI_LIBS_DIR/$ABI"
    cp "$BUILD_DIR/liblocal-llm-jni.so" "$JNI_LIBS_DIR/$ABI/"

    echo "✅ $ABI done — $(ls -lh "$JNI_LIBS_DIR/$ABI/liblocal-llm-jni.so" | awk '{print $5}')"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "All architectures built successfully! 🎉"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Prebuilt libraries are in:"
echo "  $JNI_LIBS_DIR"
echo ""
echo "You can now build the Android app WITHOUT NDK:"
echo "  cd mobile"
echo "  npm run build"
echo "  npx cap sync android"
echo "  npx cap open android"
echo ""
echo "To commit these for other developers:"
echo "  git add mobile/plugins/local-llm/android/src/main/jniLibs/"
echo "  git commit -m 'Add prebuilt native libraries'"
