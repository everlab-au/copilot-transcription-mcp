import { CopilotKit } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import { SchedulerTool } from '@/copilot/tools/SchedulerTool';
import "@copilotkit/react-ui/styles.css";

const apiKey = import.meta.env.VITE_COPILOTKIT_AI_PUBLIC_API_KEY as string;

export default function App() {
  useEffect(() => {
    console.log("SidePanel loaded", apiKey);
  }, []);
  return (
    <CopilotKit publicApiKey={apiKey}>
      <div style={{ padding: 16 }}>
        <h1>Copilot SidePanel</h1>
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