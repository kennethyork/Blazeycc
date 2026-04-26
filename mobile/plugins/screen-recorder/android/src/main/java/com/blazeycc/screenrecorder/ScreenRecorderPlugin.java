package com.blazeycc.screenrecorder;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
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
    private static final String CHANNEL_ID = "blazeycc_recording";
    private static final int NOTIF_ID = 2001;

    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private MediaRecorder mediaRecorder;
    private String outputPath;
    private int screenDensity;
    private int screenWidth;
    private int screenHeight;
    private boolean isRecording = false;

    private int optVideoBitrate = 8 * 1000 * 1000;
    private int optFrameRate = 30;
    private String optFormat = "mp4";

    @Override
    public void load() {
        projectionManager = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        DisplayMetrics metrics = new DisplayMetrics();
        getActivity().getWindowManager().getDefaultDisplay().getMetrics(metrics);
        screenDensity = metrics.densityDpi;
        screenWidth = metrics.widthPixels;
        screenHeight = metrics.heightPixels;
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Screen Recording", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows while Blazeycc is recording your screen");
            nm.createNotificationChannel(channel);
        }
    }

    private void showRecordingNotification() {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, getActivity().getClass());
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            ctx, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(ctx, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(ctx);
        }

        Notification notification = builder
            .setContentTitle("Blazeycc Recording")
            .setContentText("Screen recording in progress...")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build();

        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(NOTIF_ID, notification);
    }

    private void cancelRecordingNotification() {
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(NOTIF_ID);
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        if (isRecording) {
            call.reject("Already recording");
            return;
        }

        Integer bitrate = call.getInt("videoBitrate");
        Integer fps = call.getInt("frameRate");
        String format = call.getString("format");
        String quality = call.getString("quality");

        if (bitrate != null && bitrate > 0) {
            optVideoBitrate = bitrate;
        } else if (quality != null) {
            optVideoBitrate = qualityToBitrate(quality);
        } else {
            optVideoBitrate = 8 * 1000 * 1000;
        }

        if (fps != null && fps > 0) {
            optFrameRate = fps;
        } else {
            optFrameRate = 30;
        }

        if (format != null && (format.equals("mp4") || format.equals("webm"))) {
            optFormat = format;
        } else {
            optFormat = "mp4";
        }

        Intent intent = projectionManager.createScreenCaptureIntent();
        startActivityForResult(call, intent, REQUEST_CODE);
    }

    private int qualityToBitrate(String quality) {
        switch (quality) {
            case "low":    return 2_000_000;
            case "medium": return 5_000_000;
            case "high":   return 8_000_000;
            case "ultra":  return 15_000_000;
            default:       return 5_000_000;
        }
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
            Log.w(TAG, "RuntimeException on stop (no data recorded)", e);
            try { new File(savedPath).delete(); } catch (Exception ignored) {}
            isRecording = false;
            cleanupRecorder();
            cancelRecordingNotification();
            call.reject("Recording too short — no data captured. Record for at least 2 seconds.");
            return;
        }

        try {
            mediaRecorder.reset();
            virtualDisplay.release();
            mediaProjection.stop();
            isRecording = false;
            cancelRecordingNotification();

            JSObject result = new JSObject();
            result.put("path", savedPath);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Stop recording failed", e);
            isRecording = false;
            cleanupRecorder();
            cancelRecordingNotification();
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
                showRecordingNotification();

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
        File dir = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES), "Blazeycc");
        if (!dir.exists()) dir.mkdirs();

        String ext = optFormat.equals("webm") ? ".webm" : ".mp4";
        outputPath = new File(dir, "REC_" + timestamp + ext).getAbsolutePath();

        mediaRecorder = new MediaRecorder();
        mediaRecorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
        mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);

        if (optFormat.equals("webm")) {
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.WEBM);
            mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.VP8);
        } else {
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
        }

        mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
        mediaRecorder.setVideoEncodingBitRate(optVideoBitrate);
        mediaRecorder.setVideoFrameRate(optFrameRate);
        mediaRecorder.setVideoSize(screenWidth, screenHeight);
        mediaRecorder.setOutputFile(outputPath);
        mediaRecorder.prepare();
    }
}
