export interface ScreenRecorderPlugin {
  startRecording(): Promise<{ started: boolean }>;
  stopRecording(): Promise<{ path: string }>;
}

declare module '@capacitor/core' {
  interface PluginRegistry {
    ScreenRecorder: ScreenRecorderPlugin;
  }
}
