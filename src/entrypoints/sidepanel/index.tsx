import { useEffect, useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { SchedulerTool } from "@/copilot/tools/SchedulerTool";
import "@copilotkit/react-ui/styles.css";

const apiKey = import.meta.env.VITE_COPILOTKIT_AI_PUBLIC_API_KEY as string;
let previousTabStream: MediaStream | null = null;

export default function App() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const startCapture = async () => {
    setDownloadUrl(null);
    setIsRecording(true);

    try {
      if (previousTabStream) {
        previousTabStream.getTracks().forEach((t) => t.stop());
        previousTabStream = null;
      }

      const tabStream = await new Promise<MediaStream>((resolve, reject) => {
        chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
          if (!stream || chrome.runtime.lastError) {
            reject(
              chrome.runtime.lastError ||
                new Error("Failed to capture tab audio")
            );
          } else {
            previousTabStream = stream;
            resolve(stream);
          }
        });
      });

      // const micStream = await navigator.mediaDevices.getUserMedia({
      //   audio: true,
      // });
      // const mixedStream = new MediaStream([
      //   ...tabStream.getAudioTracks(),
      //   ...micStream.getAudioTracks(),
      // ]);

      const recorder = new MediaRecorder(tabStream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsRecording(false);
        window.close();
      };

      recorder.start();
      setTimeout(() => recorder.stop(), 10000); // auto-stop after 10s
    } catch (err) {
      console.error("Recording error:", err);
      setIsRecording(false);
      alert(`Recording failed: ${err.message}`);
    }
  };

  useEffect(() => {
    // If this is no longer the active tab, close yourself
    /*
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "TAB_SWITCHED") {
        // window.close(); // ✅ closes the side panel
        chrome.sidePanel.setOptions({
          tabId: msg.tabId,
          enabled: false,
        });
        console.log("Tab switched, closing side panel", msg.tabId);
      }
    });*/
  }, []);

  return (
    <CopilotKit publicApiKey={apiKey}>
      <div style={{ padding: 16 }}>
        <h1>Copilot SidePanel</h1>

        <button onClick={startCapture}>Start Audio Capture</button>

        {isRecording && (
          <p style={{ color: "green", marginTop: 12 }}>🎙️ Capturing audio...</p>
        )}

        {downloadUrl && (
          <div style={{ marginTop: 20 }}>
            <a href={downloadUrl} download="captured_audio.webm">
              🎧 Download Captured Audio
            </a>
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
    </CopilotKit>
  );
}
