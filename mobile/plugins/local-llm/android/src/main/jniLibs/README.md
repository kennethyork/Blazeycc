# Prebuilt Native Libraries

These directories contain prebuilt `.so` files for Android. Once built, anyone can compile the Android app **without installing the Android NDK, CMake, or any C++ toolchain**.

## Quick Start (for app developers)

If `.so` files already exist here, just build:
```bash
cd mobile
npm install
npm run build
npx cap sync android
npx cap open android
# Click ▶️ Run in Android Studio
```

## Building the Native Libraries (for maintainers only)

You only need to do this once when:
- Setting up the project for the first time
- Updating llama.cpp to a newer version
- Adding a new Android architecture

### Prerequisites
- Android NDK (install via Android Studio: Tools → SDK Manager → SDK Tools → NDK)
- Set `ANDROID_NDK_HOME` environment variable

### Build
```bash
cd mobile/plugins/local-llm
./build-native.sh
```

This clones llama.cpp, cross-compiles for `arm64-v8a`, `armeabi-v7a`, and `x86_64`, and places the `.so` files in these directories.

### Commit for others
```bash
git add android/src/main/jniLibs/
git commit -m "Add prebuilt native libraries for Android"
```

## Sizes (typical)

| Architecture | Size |
|--------------|------|
| arm64-v8a | ~4-6 MB |
| armeabi-v7a | ~3-5 MB |
| x86_64 | ~5-7 MB |
