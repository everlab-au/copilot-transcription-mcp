import { useEffect, useRef, useState } from "react";
import { useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { SchedulerTool } from "@/copilot/tools/SchedulerTool";
import "@copilotkit/react-ui/styles.css";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const { appendMessage } = useCopilotChat();
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceStartTimeRef = useRef<number | null>(null);
  const chunkStartTimeRef = useRef<number>(Date.now());
  const chunkVolumeSumRef = useRef<number>(0);
  const chunkVolumeSamplesRef = useRef<number>(0);

  const SILENCE_THRESHOLD = 0.01;
  const SILENCE_MAX_DURATION_MS = 100;
  const MIN_AUDIO_CHUNK_DURATION_MS = 2000;
  const MIN_AVG_VOLUME_THRESHOLD = 0.001;

  const startCapture = async () => {
    setIsRecording(true);
    const stream = await new Promise<MediaStream>((resolve, reject) => {
      chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
        if (!stream || chrome.runtime.lastError) {
          reject(
            chrome.runtime.lastError || new Error("Failed to capture tab audio")
          );
        } else {
          resolve(stream);
        }
      });
    });
    mediaStreamRef.current = stream;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    startRecorder();
    monitorVolume(analyser);
  };

  const startRecorder = () => {
    if (!mediaStreamRef.current) return;
    const recorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType: "audio/webm",
    });
    mediaRecorderRef.current = recorder;
    chunkStartTimeRef.current = Date.now();
    chunkVolumeSumRef.current = 0;
    chunkVolumeSamplesRef.current = 0;

    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = async () => {
      const avgVolume =
        chunkVolumeSumRef.current / Math.max(chunkVolumeSamplesRef.current, 1);
      if (avgVolume < MIN_AVG_VOLUME_THRESHOLD) {
        console.log(
          "🟡 Skipping blank audio segment (avg volume:",
          avgVolume.toFixed(4),
          ")"
        );
        startRecorder();
        return;
      }

      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "segment.webm");
      try {
        const res = await fetch("http://localhost:3000/transcribe", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        const { text } = await res.json();
        if (text?.trim()) {
          appendMessage(
            new TextMessage({ role: Role.User, content: text.trim() })
          );
          setTranscript((prev) => prev + "\n" + text.trim());
        }
      } catch (err) {
        console.error("Transcription error:", err);
      }
      startRecorder(); // restart after transcription is sent
    };

    recorder.start();
  };

  const monitorVolume = (analyser: AnalyserNode) => {
    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const checkSilence = () => {
      analyser.getByteFrequencyData(buffer);
      const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length / 255;
      const now = Date.now();

      chunkVolumeSumRef.current += avg;
      chunkVolumeSamplesRef.current += 1;

      const hasEnoughAudio =
        now - chunkStartTimeRef.current >= MIN_AUDIO_CHUNK_DURATION_MS;

      if (avg < SILENCE_THRESHOLD) {
        if (silenceStartTimeRef.current === null) {
          silenceStartTimeRef.current = now;
        } else if (
          now - silenceStartTimeRef.current > SILENCE_MAX_DURATION_MS &&
          hasEnoughAudio &&
          mediaRecorderRef.current?.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
          silenceStartTimeRef.current = null;
        }
      } else {
        silenceStartTimeRef.current = null;
      }
      requestAnimationFrame(checkSilence);
    };
    checkSilence();
  };

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Copilot SidePanel</h1>

      <button onClick={startCapture}>Start Audio Capture</button>

      {isRecording && (
        <p style={{ color: "green", marginTop: 12 }}>
          🎙️ Capturing audio with silence detection...
        </p>
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
