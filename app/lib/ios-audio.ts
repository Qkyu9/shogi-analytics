/** Vercel のリクエスト上限（4.5MB）に余裕を持たせたクライアント側しきい値 */
export const CHUNK_THRESHOLD_BYTES = 3.2 * 1024 * 1024;
export const CHUNK_SECONDS = 45;

/** iPhone の Chrome/Firefox も WebKit のため、UA だけでは Safari と判定できない */
export function isIOSOrWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return true;
  return false;
}

export function audioBlobExtension(blob: Blob): string {
  const t = (blob.type || "").toLowerCase();
  if (t.includes("mp4") || t.includes("m4a") || t.includes("aac")) return "m4a";
  if (t.includes("webm")) return "webm";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("wav")) return "wav";
  if (t.includes("caf")) return "caf";
  return "m4a";
}

/** Safari が JSON 以外を渡すと "The string did not match the expected pattern" になる */
export async function parseJsonResponse<T extends { error?: string }>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (res.status === 413) {
      throw new Error(
        "音声データが大きすぎて送信できませんでした。録音を短く区切って再度お試しください。"
      );
    }
    throw new Error(
      `サーバーから応答がありませんでした（${res.status}）。通信環境を確認してください。`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    if (res.status === 413) {
      throw new Error(
        "音声データが大きすぎて送信できませんでした。2分ほどに区切って録音してください。"
      );
    }
    throw new Error(
      `サーバーとの通信に失敗しました（${res.status}）。しばらくしてから再度お試しください。`
    );
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bitsPerSample = 16;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function trimAudioBuffer(
  buffer: AudioBuffer,
  startSec: number,
  durationSec: number
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.floor(startSec * sampleRate);
  const length = Math.min(
    Math.floor(durationSec * sampleRate),
    buffer.length - startSample
  );
  const trimmed = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length,
    sampleRate,
  });
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    trimmed.copyToChannel(
      buffer.getChannelData(ch).subarray(startSample, startSample + length),
      ch
    );
  }
  return trimmed;
}

/** 大きな m4a を 45 秒ごとの WAV に分割（Vercel 4.5MB 制限回避） */
export async function splitAudioToWavChunks(
  blob: Blob,
  chunkSec = CHUNK_SECONDS
): Promise<Blob[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const targetRate = 16000;
    const chunks: Blob[] = [];

    for (let start = 0; start < audioBuffer.duration; start += chunkSec) {
      const duration = Math.min(chunkSec, audioBuffer.duration - start);
      const frameCount = Math.ceil(duration * targetRate);
      const offline = new OfflineAudioContext(1, frameCount, targetRate);
      const source = offline.createBufferSource();
      source.buffer = trimAudioBuffer(audioBuffer, start, duration);
      source.connect(offline.destination);
      source.start(0);
      const rendered = await offline.startRendering();
      chunks.push(encodeWav(rendered.getChannelData(0), targetRate));
    }

    return chunks.filter((c) => c.size > 0);
  } finally {
    await audioContext.close();
  }
}

export async function buildUploadChunks(blob: Blob): Promise<Blob[]> {
  if (blob.size <= CHUNK_THRESHOLD_BYTES) return [blob];
  try {
    const wavChunks = await splitAudioToWavChunks(blob);
    if (wavChunks.length > 0) return wavChunks;
  } catch (e) {
    console.warn("audio chunk split failed, trying single upload:", e);
  }
  if (blob.size > 4.5 * 1024 * 1024) {
    throw new Error(
      "録音が長すぎて送信できません。2分ほどに区切って録音してください。"
    );
  }
  return [blob];
}
