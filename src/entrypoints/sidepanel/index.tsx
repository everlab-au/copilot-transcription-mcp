import { useEffect, useRef, useState } from "react";
import { useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { SchedulerTool } from "@/copilot/tools/SchedulerTool";
import "@copilotkit/react-ui/styles.css";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const { appendMessage } = useCopilotChat();

  // --- Settings ---
  const manualChunk = true;
  const TAB_CAPTURE_INITIAL_DELAY_MS = 2500;
  const MIC_CHUNK_INTERVAL_MS = 5000;
  const TAB_CHUNK_INTERVAL_MS = 5000;
  const captureTabAudio = true;
  const captureMicAudio = true;

  // --- Silence Detection Settings ---
  const SILENCE_THRESHOLD = 0.01;
  const SILENCE_MAX_DURATION_MS = 100;
  const MIN_AUDIO_CHUNK_DURATION_MS = 2000;
  const MIN_AVG_VOLUME_THRESHOLD = 0.001;

  const micStreamRef = useRef<MediaStream | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const micTimeoutRef = useRef<number | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micSilenceStartTimeRef = useRef<number | null>(null);
  const micChunkStartTimeRef = useRef<number>(Date.now());
  const micVolumeSumRef = useRef<number>(0);
  const micVolumeSamplesRef = useRef<number>(0);

  const tabStreamRef = useRef<MediaStream | null>(null);
  const tabRecorderRef = useRef<MediaRecorder | null>(null);
  const tabTimeoutRef = useRef<number | null>(null);
  const tabAnalyserRef = useRef<AnalyserNode | null>(null);
  const tabSilenceStartTimeRef = useRef<number | null>(null);
  const tabChunkStartTimeRef = useRef<number>(Date.now());
  const tabVolumeSumRef = useRef<number>(0);
  const tabVolumeSamplesRef = useRef<number>(0);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const startRecorderLoop = (args: any) => {
    const {
      stream,
      prefix,
      recorderRef,
      timeoutRef,
      chunkInterval,
      analyserRef,
      silenceStartRef,
      chunkStartRef,
      volumeSumRef,
      volumeSamplesRef,
    } = args;

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const avgVolume =
        volumeSumRef && volumeSamplesRef
          ? volumeSumRef.current / Math.max(volumeSamplesRef.current, 1)
          : 1;

      if (!manualChunk && avgVolume < MIN_AVG_VOLUME_THRESHOLD) {
        console.log(
          `🟡 Skipping blank [${prefix}] (avg volume: ${avgVolume.toFixed(4)})`
        );
        if (chunkStartRef) chunkStartRef.current = Date.now();
        if (volumeSumRef) volumeSumRef.current = 0;
        if (volumeSamplesRef) volumeSamplesRef.current = 0;
        if (isRecordingRef.current) startRecorderLoop(args);
        return;
      }

      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, `segment-${prefix}.webm`);
      setDownloadUrl(URL.createObjectURL(blob));

      try {
        const res = await fetch("http://localhost:3001/transcribe", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        const { text } = await res.json();
        if (text?.trim()) {
          const content = `[${prefix}] ${text.trim()}`;
          appendMessage(new TextMessage({ role: Role.User, content }));
          setTranscript((prev) => prev + "\n" + content);
        }
      } catch (err) {
        console.error("Transcription error:", err);
      }

      if (chunkStartRef) chunkStartRef.current = Date.now();
      if (volumeSumRef) volumeSumRef.current = 0;
      if (volumeSamplesRef) volumeSamplesRef.current = 0;

      if (isRecordingRef.current) startRecorderLoop(args);
    };

    recorder.start();

    if (manualChunk) {
      timeoutRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, chunkInterval);
    }
  };

  const monitorSilence = (analyser: AnalyserNode, refs: any) => {
    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const check = () => {
      analyser.getByteFrequencyData(buffer);
      const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length / 255;
      const now = Date.now();

      refs.volumeSumRef.current += avg;
      refs.volumeSamplesRef.current += 1;

      const hasEnoughAudio =
        now - refs.chunkStartRef.current >= MIN_AUDIO_CHUNK_DURATION_MS;

      if (avg < SILENCE_THRESHOLD) {
        if (refs.silenceStartRef.current === null) {
          refs.silenceStartRef.current = now;
        } else if (
          now - refs.silenceStartRef.current > SILENCE_MAX_DURATION_MS &&
          hasEnoughAudio &&
          refs.recorderRef.current?.state === "recording"
        ) {
          refs.recorderRef.current.stop();
          refs.silenceStartRef.current = null;
        }
      } else {
        refs.silenceStartRef.current = null;
      }

      if (isRecordingRef.current) requestAnimationFrame(check);
    };

    check();
  };

  const startCapture = async () => {
    setIsRecording(true);
    isRecordingRef.current = true;

    if (captureMicAudio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        micStreamRef.current = stream;
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        micAnalyserRef.current = analyser;

        startRecorderLoop({
          stream,
          prefix: "Me",
          recorderRef: micRecorderRef,
          timeoutRef: micTimeoutRef,
          chunkInterval: MIC_CHUNK_INTERVAL_MS,
          analyserRef: micAnalyserRef,
          silenceStartRef: micSilenceStartTimeRef,
          chunkStartRef: micChunkStartTimeRef,
          volumeSumRef: micVolumeSumRef,
          volumeSamplesRef: micVolumeSamplesRef,
        });

        if (!manualChunk) {
          monitorSilence(analyser, {
            recorderRef: micRecorderRef,
            silenceStartRef: micSilenceStartTimeRef,
            chunkStartRef: micChunkStartTimeRef,
            volumeSumRef: micVolumeSumRef,
            volumeSamplesRef: micVolumeSamplesRef,
          });
        }
      } catch (err) {
        alert("Mic access denied.");
      }
    }

    if (captureTabAudio) {
      try {
        const stream = await new Promise<MediaStream>((resolve, reject) => {
          chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
            if (!stream || chrome.runtime.lastError) {
              reject(
                chrome.runtime.lastError || new Error("Tab capture failed")
              );
            } else resolve(stream);
          });
        });

        tabStreamRef.current = stream;
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        tabAnalyserRef.current = analyser;

        setTimeout(() => {
          if (!isRecordingRef.current) return;

          startRecorderLoop({
            stream,
            prefix: "Other",
            recorderRef: tabRecorderRef,
            timeoutRef: tabTimeoutRef,
            chunkInterval: TAB_CHUNK_INTERVAL_MS,
            analyserRef: tabAnalyserRef,
            silenceStartRef: tabSilenceStartTimeRef,
            chunkStartRef: tabChunkStartTimeRef,
            volumeSumRef: tabVolumeSumRef,
            volumeSamplesRef: tabVolumeSamplesRef,
          });

          if (!manualChunk) {
            monitorSilence(analyser, {
              recorderRef: tabRecorderRef,
              silenceStartRef: tabSilenceStartTimeRef,
              chunkStartRef: tabChunkStartTimeRef,
              volumeSumRef: tabVolumeSumRef,
              volumeSamplesRef: tabVolumeSamplesRef,
            });
          }
        }, TAB_CAPTURE_INITIAL_DELAY_MS);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopCapture = () => {
    setIsRecording(false);
    isRecordingRef.current = false;

    micRecorderRef.current?.stop();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());

    tabRecorderRef.current?.stop();
    tabStreamRef.current?.getTracks().forEach((t) => t.stop());
  };

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Copilot SidePanel</h1>
      <button onClick={isRecording ? stopCapture : startCapture}>
        {isRecording ? "🔚 Stop Audio Capture" : "🎧 Start Audio Capture"}
      </button>

      {isRecording && (
        <p style={{ color: "green", marginTop: 12 }}>
          🎧 Recording... {manualChunk ? "Manual" : "Silence"} | Sources:{" "}
          {captureMicAudio && captureTabAudio
            ? "Mic + Tab"
            : captureMicAudio
            ? "Mic"
            : captureTabAudio
            ? "Tab"
            : "None"}
        </p>
      )}

      {downloadUrl && (
        <div style={{ marginTop: 20 }}>
          <a href={downloadUrl} download="captured_audio.webm">
            🎧 Download Last Captured Audio
          </a>
        </div>
      )}

      {transcript && (
        <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
          <h3>📝 Transcript:</h3>
          <p>{transcript}</p>
        </div>
      )}

      <SchedulerTool />
      <CopilotChat
        labels={{
          title: "Your Assistant",
          initial: "Hi! 👋 How can I assist you today?",
        }}
      />
    </div>
  );
}
