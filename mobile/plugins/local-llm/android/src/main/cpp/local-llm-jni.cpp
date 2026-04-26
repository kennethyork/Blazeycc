#include <jni.h>
#include <string>
#include <vector>
#include <llama.h>

static llama_model* g_model = nullptr;
static llama_context* g_ctx = nullptr;
static llama_sampler* g_sampler = nullptr;
static int g_tokens_generated = 0;

extern "C" JNIEXPORT jboolean JNICALL
Java_com_blazeycc_localllm_LocalLlmPlugin_nativeLoadModel(JNIEnv* env, jobject /*thiz*/, jstring path) {
    const char* model_path = env->GetStringUTFChars(path, nullptr);

    llama_model_params mparams = llama_model_default_params();
    // For mobile: limit memory usage
    mparams.n_gpu_layers = 0; // CPU only for compatibility

    g_model = llama_load_model_from_file(model_path, mparams);
    env->ReleaseStringUTFChars(path, model_path);

    if (!g_model) return false;

    llama_context_params cparams = llama_context_default_params();
    cparams.n_ctx = 2048;
    cparams.n_batch = 512;
    cparams.n_ubatch = 512;

    g_ctx = llama_new_context_with_model(g_model, cparams);
    if (!g_ctx) {
        llama_free_model(g_model);
        g_model = nullptr;
        return false;
    }

    // Create sampler: temperature + top-p + repeat penalty
    g_sampler = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler_chain_add(g_sampler, llama_sampler_init_top_p(0.95f, 1));
    llama_sampler_chain_add(g_sampler, llama_sampler_init_temp(0.7f));
    llama_sampler_chain_add(g_sampler, llama_sampler_init_dist(1234));

    g_tokens_generated = 0;
    return true;
}

extern "C" JNIEXPORT void JNICALL
Java_com_blazeycc_localllm_LocalLlmPlugin_nativeUnloadModel(JNIEnv* /*env*/, jobject /*thiz*/) {
    if (g_sampler) {
        llama_sampler_free(g_sampler);
        g_sampler = nullptr;
    }
    if (g_ctx) {
        llama_free(g_ctx);
        g_ctx = nullptr;
    }
    if (g_model) {
        llama_free_model(g_model);
        g_model = nullptr;
    }
    g_tokens_generated = 0;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_blazeycc_localllm_LocalLlmPlugin_nativeGenerate(JNIEnv* env, jobject /*thiz*/,
                                                          jstring prompt,
                                                          jint max_tokens,
                                                          jfloat temperature) {
    if (!g_model || !g_ctx || !g_sampler) {
        return env->NewStringUTF("");
    }

    const char* prompt_cstr = env->GetStringUTFChars(prompt, nullptr);
    std::string prompt_str(prompt_cstr);
    env->ReleaseStringUTFChars(prompt, prompt_cstr);

    // Tokenize prompt
    const int n_vocab = llama_n_vocab(g_model);
    const llama_token bos = llama_token_bos(g_model);
    const llama_token eos = llama_token_eos(g_model);

    std::vector<llama_token> prompt_tokens;
    prompt_tokens.reserve(prompt_str.size() + 1);

    int n_tokens = llama_tokenize(
        g_model,
        prompt_str.c_str(),
        prompt_str.length(),
        prompt_tokens.data(),
        prompt_tokens.capacity(),
        true,   // add bos
        false   // special tokens
    );

    if (n_tokens < 0) {
        prompt_tokens.resize(-n_tokens);
        n_tokens = llama_tokenize(
            g_model,
            prompt_str.c_str(),
            prompt_str.length(),
            prompt_tokens.data(),
            prompt_tokens.size(),
            true,
            false
        );
    } else {
        prompt_tokens.resize(n_tokens);
    }

    if (n_tokens < 0) return env->NewStringUTF("");

    // Evaluate prompt
    llama_batch batch = llama_batch_init(prompt_tokens.size(), 0, 1);
    for (size_t i = 0; i < prompt_tokens.size(); i++) {
        batch.token[batch.n_tokens] = prompt_tokens[i];
        batch.pos[batch.n_tokens] = i;
        batch.n_seq_id[batch.n_tokens] = 1;
        batch.seq_id[batch.n_tokens][0] = 0;
        batch.logits[batch.n_tokens] = 0;
        batch.n_tokens++;
    }
    batch.logits[batch.n_tokens - 1] = true;

    if (llama_decode(g_ctx, batch) != 0) {
        llama_batch_free(batch);
        return env->NewStringUTF("");
    }
    llama_batch_free(batch);

    // Update sampler temperature if changed
    // (simplification: we recreate sampler or just keep default)

    // Generate
    std::string result;
    result.reserve(max_tokens * 4);

    llama_token new_token_id;
    for (int i = 0; i < max_tokens; i++) {
        new_token_id = llama_sampler_sample(g_sampler, g_ctx, -1);

        if (llama_token_is_eog(g_model, new_token_id)) break;

        char piece[256];
        int n_chars = llama_token_to_piece(g_model, new_token_id, piece, sizeof(piece), 0, true);
        if (n_chars > 0) {
            result.append(piece, n_chars);
        }

        // Evaluate the new token
        llama_batch batch_next = llama_batch_init(1, 0, 1);
        batch_next.token[0] = new_token_id;
        batch_next.pos[0] = prompt_tokens.size() + i;
        batch_next.n_seq_id[0] = 1;
        batch_next.seq_id[0][0] = 0;
        batch_next.logits[0] = true;
        batch_next.n_tokens = 1;
        if (llama_decode(g_ctx, batch_next) != 0) {
            llama_batch_free(batch_next);
            break;
        }
        llama_batch_free(batch_next);

        g_tokens_generated++;
    }

    return env->NewStringUTF(result.c_str());
}

extern "C" JNIEXPORT jint JNICALL
Java_com_blazeycc_localllm_LocalLlmPlugin_nativeGetTokensGenerated(JNIEnv* /*env*/, jobject /*thiz*/) {
    return g_tokens_generated;
}
