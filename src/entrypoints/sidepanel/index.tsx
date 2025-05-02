import { useEffect, useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { SchedulerTool } from "@/copilot/tools/SchedulerTool";
import "@copilotkit/react-ui/styles.css";

const apiKey = import.meta.env.VITE_COPILOTKIT_AI_PUBLIC_API_KEY as string;

export default function App() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const startCapture = () => {
    setDownloadUrl(null);
    setIsRecording(true);

    chrome.runtime.sendMessage({ type: "START_TAB_AUDIO_CAPTURE" }, (res) => {
      if (!res?.success) {
        console.error("❌ Failed to start audio capture.");
        setIsRecording(false);
      } else {
        console.log("🎙️ Recording started via offscreen");
      }
    });
  };

  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.type === "AUDIO_CAPTURE_COMPLETE" && msg.url) {
        setDownloadUrl(msg.url);
        setIsRecording(false);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
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
