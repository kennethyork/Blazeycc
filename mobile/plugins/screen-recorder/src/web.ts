import { WebPlugin } from '@capacitor/core';
import type { ScreenRecorderPlugin } from './definitions';

export class ScreenRecorderWeb extends WebPlugin implements ScreenRecorderPlugin {
  async startRecording(): Promise<{ started: boolean }> {
    console.warn('ScreenRecorder: web fallback — use MediaRecorder API');
    return { started: false };
  }

  async stopRecording(): Promise<{ path: string }> {
    return { path: '' };
  }
}
