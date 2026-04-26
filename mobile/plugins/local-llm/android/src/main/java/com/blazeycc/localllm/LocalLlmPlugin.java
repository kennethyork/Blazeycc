package com.blazeycc.localllm;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "LocalLlm")
public class LocalLlmPlugin extends Plugin {

    private static boolean nativeLibAvailable = false;
    private String currentModelPath = null;
    private boolean modelLoaded = false;

    // Native methods
    public native boolean nativeLoadModel(String path);
    public native void nativeUnloadModel();
    public native String nativeGenerate(String prompt, int maxTokens, float temperature);
    public native int nativeGetTokensGenerated();

    static {
        try {
            System.loadLibrary("local-llm-jni");
            nativeLibAvailable = true;
        } catch (UnsatisfiedLinkError e) {
            android.util.Log.w("LocalLlm", "Native library not available: " + e.getMessage());
            nativeLibAvailable = false;
        }
    }

    @PluginMethod
    public void isNativeLibAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", nativeLibAvailable);
        call.resolve(result);
    }

    @PluginMethod
    public void downloadModel(PluginCall call) {
        String urlStr = call.getString("url");
        String filename = call.getString("filename");

        if (urlStr == null || filename == null) {
            call.reject("Missing url or filename");
            return;
        }

        new Thread(() -> {
            try {
                File modelsDir = new File(getContext().getFilesDir(), "models");
                if (!modelsDir.exists()) modelsDir.mkdirs();

                File outputFile = new File(modelsDir, filename);
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(30000);

                long totalSize = conn.getContentLengthLong();
                InputStream in = conn.getInputStream();
                FileOutputStream out = new FileOutputStream(outputFile);

                byte[] buffer = new byte[8192];
                long downloaded = 0;
                int read;

                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                    downloaded += read;
                    // Could emit progress here via notifyListeners
                }

                out.close();
                in.close();

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("path", outputFile.getAbsolutePath());
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        if (!nativeLibAvailable) {
            call.reject("Native library not available. Build .so files with build-native.sh or use remote Ollama backend.");
            return;
        }

        String path = call.getString("path");
        if (path == null) {
            call.reject("Missing path");
            return;
        }

        new Thread(() -> {
            try {
                boolean success = nativeLoadModel(path);
                modelLoaded = success;
                if (success) {
                    currentModelPath = path;
                    call.resolve(new JSObject().put("success", true));
                } else {
                    call.reject("Failed to load model");
                }
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void unloadModel(PluginCall call) {
        if (nativeLibAvailable && modelLoaded) {
            nativeUnloadModel();
        }
        modelLoaded = false;
        currentModelPath = null;
        call.resolve();
    }

    @PluginMethod
    public void generate(PluginCall call) {
        if (!nativeLibAvailable) {
            call.reject("Native library not available");
            return;
        }
        if (!modelLoaded) {
            call.reject("No model loaded");
            return;
        }

        String prompt = call.getString("prompt", "");
        int maxTokens = call.getInt("maxTokens", 256);
        float temperature = call.getFloat("temperature", 0.7f);

        new Thread(() -> {
            try {
                String text = nativeGenerate(prompt, maxTokens, temperature);
                int tokens = nativeGetTokensGenerated();

                JSObject result = new JSObject();
                result.put("text", text);
                result.put("tokensGenerated", tokens);
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void isModelLoaded(PluginCall call) {
        JSObject result = new JSObject();
        result.put("loaded", nativeLibAvailable && modelLoaded);
        call.resolve(result);
    }

    @PluginMethod
    public void getModelPath(PluginCall call) {
        File modelsDir = new File(getContext().getFilesDir(), "models");
        JSObject result = new JSObject();
        result.put("path", modelsDir.getAbsolutePath());
        call.resolve(result);
    }
}
