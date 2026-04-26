package com.blazeycc.screenrecorder;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Environment;
import android.util.DisplayMetrics;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

@CapacitorPlugin(name = "ScreenRecorder")
public class ScreenRecorderPlugin extends Plugin {
    private static final int REQUEST_CODE = 1001;
    private static final String TAG = "ScreenRecorder";

    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private MediaRecorder mediaRecorder;
    private String outputPath;
    private int screenDensity;
    private int screenWidth;
    private int screenHeight;
    private boolean isRecording = false;

    @Override
    public void load() {
        projectionManager = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        DisplayMetrics metrics = new DisplayMetrics();
        getActivity().getWindowManager().getDefaultDisplay().getMetrics(metrics);
        screenDensity = metrics.densityDpi;
        screenWidth = metrics.widthPixels;
        screenHeight = metrics.heightPixels;
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        if (isRecording) {
            call.reject("Already recording");
            return;
        }

        Intent intent = projectionManager.createScreenCaptureIntent();
        startActivityForResult(call, intent, REQUEST_CODE);
    }

    @PluginMethod
    public void stopRecording(PluginCall call) {
        if (!isRecording) {
            call.reject("Not recording");
            return;
        }

        String savedPath = outputPath;
        try {
            mediaRecorder.stop();
        } catch (RuntimeException e) {
            // Stop called too quickly after start — no valid data
            Log.w(TAG, "RuntimeException on stop (no data recorded)", e);
            // Delete the empty file
            try { new File(savedPath).delete(); } catch (Exception ignored) {}
            isRecording = false;
            cleanupRecorder();
            call.reject("Recording too short — no data captured. Record for at least 2 seconds.");
            return;
        }

        try {
            mediaRecorder.reset();
            virtualDisplay.release();
            mediaProjection.stop();
            isRecording = false;

            JSObject result = new JSObject();
            result.put("path", savedPath);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Stop recording failed", e);
            isRecording = false;
            cleanupRecorder();
            call.reject(e.getMessage());
        }
    }

    private void cleanupRecorder() {
        try { if (virtualDisplay != null) virtualDisplay.release(); } catch (Exception ignored) {}
        try { if (mediaProjection != null) mediaProjection.stop(); } catch (Exception ignored) {}
        try { if (mediaRecorder != null) mediaRecorder.reset(); } catch (Exception ignored) {}
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_CODE) {
            PluginCall savedCall = getSavedCall();
            if (savedCall == null) return;

            if (resultCode != Activity.RESULT_OK) {
                savedCall.reject("Screen capture permission denied");
                return;
            }

            mediaProjection = projectionManager.getMediaProjection(resultCode, data);
            if (mediaProjection == null) {
                savedCall.reject("MediaProjection is null");
                return;
            }

            try {
                setupMediaRecorder();
                virtualDisplay = mediaProjection.createVirtualDisplay(
                    "BlazeyccRecorder",
                    screenWidth, screenHeight, screenDensity,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    mediaRecorder.getSurface(), null, null
                );
                mediaRecorder.start();
                isRecording = true;

                JSObject result = new JSObject();
                result.put("started", true);
                savedCall.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Start recording failed", e);
                savedCall.reject(e.getMessage());
            }
        }
    }

    private void setupMediaRecorder() throws IOException {
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        // Use app-private external files dir to avoid scoped storage issues on Android 10+
        File dir = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES), "Blazeycc");
        if (!dir.exists()) dir.mkdirs();
        outputPath = new File(dir, "REC_" + timestamp + ".mp4").getAbsolutePath();

        mediaRecorder = new MediaRecorder();
        mediaRecorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
        mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
        mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
        mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
        mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
        mediaRecorder.setVideoEncodingBitRate(8 * 1000 * 1000);
        mediaRecorder.setVideoFrameRate(30);
        mediaRecorder.setVideoSize(screenWidth, screenHeight);
        mediaRecorder.setOutputFile(outputPath);
        mediaRecorder.prepare();
    }
}
