export default defineBackground(() => {
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    console.log("action clicked");
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "START_TAB_AUDIO_CAPTURE") {
      (async () => {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!tab?.id) {
            console.error("No active tab found.");
            sendResponse({ success: false });
            return;
          }

          // ✅ RE-INVOKE extension in this tab to avoid "not invoked" error
          // await chrome.scripting.executeScript({
          //   target: { tabId: tab.id, allFrames: false },
          //   func: () => void 0,
          // });

          const contexts = await chrome.runtime.getContexts({});
          const offscreenExists = contexts.some(
            (c) => c.contextType === "OFFSCREEN_DOCUMENT"
          );
          // const isRecording = contexts.find((c) => c.documentUrl?.endsWith('#recording'));

          if (!offscreenExists) {
            await chrome.offscreen.createDocument({
              url: "/offscreen.html",
              reasons: ["USER_MEDIA"],
              justification: "Record tab audio",
            });
          }

          // if (isRecording) {
          //   chrome.runtime.sendMessage({ type: 'stop-recording', target: 'offscreen' });
          //   sendResponse({ success: true, status: 'stopped' });
          //   return;
          // }

          chrome.tabCapture.getMediaStreamId(
            { targetTabId: tab.id },
            (streamId) => {
              if (chrome.runtime.lastError || !streamId) {
                console.error("Stream ID error:", chrome.runtime.lastError);
                sendResponse({ success: false });
                return;
              }

              chrome.runtime.sendMessage({
                type: "start-recording",
                target: "offscreen",
                streamId,
              });

              // ✅ Auto-stop after 10 seconds
              setTimeout(() => {
                chrome.runtime.sendMessage({
                  type: "stop-recording",
                  target: "offscreen",
                });
              }, 10000);

              sendResponse({ success: true, status: "started" });
            }
          );
        } catch (err) {
          console.error("Recording init failed:", err);
          sendResponse({ success: false });
        }
      })();

      return true; // ✅ keep message channel open
    }
  });
});
