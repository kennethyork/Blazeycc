cmake_minimum_required(VERSION 3.22.1)
project("local-llm-jni")

# Find llama.cpp — user must place it in mobile/plugins/local-llm/android/src/main/cpp/llama.cpp
# or set LLAMA_CPP_DIR
if(NOT DEFINED LLAMA_CPP_DIR)
    set(LLAMA_CPP_DIR "${CMAKE_SOURCE_DIR}/llama.cpp")
endif()

if(NOT EXISTS "${LLAMA_CPP_DIR}/include/llama.h")
    message(FATAL_ERROR "llama.cpp not found at ${LLAMA_CPP_DIR}. \
        Clone it: git clone https://github.com/ggerganov/llama.cpp.git \
        into mobile/plugins/local-llm/android/src/main/cpp/llama.cpp")
endif()

# Build llama as static library
set(LLAMA_BUILD_COMMON ON CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
add_subdirectory(${LLAMA_CPP_DIR} llama_build)

add_library(
    local-llm-jni
    SHARED
    local-llm-jni.cpp
)

find_library(log-lib log)

target_include_directories(local-llm-jni PRIVATE ${LLAMA_CPP_DIR}/include)

target_link_libraries(
    local-llm-jni
    llama
    common
    ${log-lib}
)
