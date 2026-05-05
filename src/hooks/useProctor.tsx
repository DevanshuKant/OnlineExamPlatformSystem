import { useEffect, useRef, useState, useCallback } from "react";

export type ViolationKind = "multiple_faces" | "microphone" | "tab_switch";

type Options = {
  active: boolean;
  onViolation: (kind: ViolationKind, details?: string) => void;
};

/**
 * Lightweight in-browser proctor:
 * - Camera live monitoring + naive multi-face detection via FaceDetector API (when available)
 *   falls back to a periodic motion check.
 * - Microphone activity detection via Web Audio AnalyserNode.
 * - Tab/visibility change detection.
 */
export const useProctor = ({ active, onViolation }: Options) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMicViolation = useRef(0);
  const lastFaceViolation = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const attachStream = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      try {
        await videoRef.current.play();
      } catch {
        /* autoplay may resume on next user gesture */
      }
    }
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ac = new AC();
    if (ac.state === "suspended") await ac.resume().catch(() => {});
    const src = ac.createMediaStreamSource(stream);
    const analyser = ac.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    audioCtxRef.current = ac;
    analyserRef.current = analyser;
    setReady(true);
    setError(null);
  }, []);

  const start = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    // If already running, just confirm.
    if (streamRef.current && streamRef.current.getTracks().some((t) => t.readyState === "live")) {
      return { ok: true };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: true,
      });
      await attachStream(stream);
      return { ok: true };
    } catch (e: any) {
      const msg =
        e?.name === "NotAllowedError"
          ? "Permission denied. Please allow camera & microphone in your browser."
          : e?.name === "NotFoundError"
          ? "No camera or microphone found on this device."
          : e?.name === "NotReadableError"
          ? "Camera/microphone is being used by another application."
          : e?.message || "Could not access camera/microphone.";
      setError(msg);
      return { ok: false, error: msg };
    }
  }, [attachStream]);

  // If the video element mounts after start (route change), re-attach the stream.
  useEffect(() => {
    if (ready && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setReady(false);
  }, []);

  // Tab / visibility
  useEffect(() => {
    if (!active) return;
    const onHide = () => {
      if (document.hidden) onViolationRef.current("tab_switch", "Tab/window switched");
    };
    const onBlur = () => onViolationRef.current("tab_switch", "Window lost focus");
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
    };
  }, [active]);

  // Mic + face loop
  useEffect(() => {
    if (!active || !ready) return;
    const FD = (window as any).FaceDetector;
    const detector = FD ? new FD({ fastMode: true, maxDetectedFaces: 5 }) : null;
    const data = new Uint8Array(analyserRef.current?.frequencyBinCount || 256);

    // Skin-tone heuristic fallback (when FaceDetector unavailable):
    // count connected horizontal bands of skin-colored pixels in downsampled frame.
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 60;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const detectBlobsFallback = (): number => {
      const v = videoRef.current;
      if (!v || !ctx || v.readyState < 2) return 1;
      try {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const { data: px } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const mask = new Uint8Array(canvas.width * canvas.height);
        for (let i = 0, j = 0; i < px.length; i += 4, j++) {
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const isSkin =
            r > 95 && g > 40 && b > 20 &&
            max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b;
          mask[j] = isSkin ? 1 : 0;
        }
        // flood-fill connected components, count sizable ones
        const visited = new Uint8Array(mask.length);
        const W = canvas.width, H = canvas.height;
        let blobs = 0;
        const stack: number[] = [];
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i] || visited[i]) continue;
          let size = 0;
          stack.push(i);
          while (stack.length) {
            const k = stack.pop()!;
            if (visited[k] || !mask[k]) continue;
            visited[k] = 1;
            size++;
            const x = k % W, y = (k / W) | 0;
            if (x > 0) stack.push(k - 1);
            if (x < W - 1) stack.push(k + 1);
            if (y > 0) stack.push(k - W);
            if (y < H - 1) stack.push(k + W);
          }
          if (size > 60) blobs++;
        }
        return blobs;
      } catch {
        return 1;
      }
    };

    let faceTick = 0;
    let noFaceStreak = 0;

    const tick = async () => {
      // microphone level
      if (analyserRef.current) {
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        if (rms > 0.18 && Date.now() - lastMicViolation.current > 4000) {
          lastMicViolation.current = Date.now();
          onViolationRef.current("microphone", `High audio level (${rms.toFixed(2)})`);
        }
      }
      // face detect every ~1s (every 30 frames @ ~30fps)
      faceTick++;
      if (videoRef.current && videoRef.current.readyState >= 2 && faceTick % 30 === 0) {
        let faces = 1;
        if (detector) {
          try {
            const f = await detector.detect(videoRef.current);
            faces = f.length;
          } catch {
            faces = detectBlobsFallback();
          }
        } else {
          faces = detectBlobsFallback();
        }
        if (faces > 1 && Date.now() - lastFaceViolation.current > 4000) {
          lastFaceViolation.current = Date.now();
          onViolationRef.current("multiple_faces", `${faces} faces detected`);
        }
        if (faces === 0) {
          noFaceStreak++;
          if (noFaceStreak >= 3 && Date.now() - lastFaceViolation.current > 5000) {
            lastFaceViolation.current = Date.now();
            onViolationRef.current("multiple_faces", "No face visible in camera");
            noFaceStreak = 0;
          }
        } else {
          noFaceStreak = 0;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, ready]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, start, stop, ready, error };
};