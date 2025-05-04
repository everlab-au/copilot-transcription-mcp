export default defineBackground(() => {
  let currentPanelTabId = null;

  console.log("Background script loaded");
  // chrome.sidePanel
  // .setPanelBehavior({ openPanelOnActionClick: true })
  // .catch((error) => console.error(error));

  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;

    chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "sidepanel.html",
      enabled: true,
    });

    chrome.sidePanel.open({ tabId: tab.id });
    currentPanelTabId = tab.id;
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    // Logic for closing side panel when switching tabs
    /*
    if (currentPanelTabId !== null && currentPanelTabId !== tabId) {
      chrome.sidePanel.setOptions({
        tabId: currentPanelTabId,
        enabled: false,
      });
    }

    chrome.sidePanel.setOptions({
      tabId: tabId,
      enabled: false,
    });

    chrome.runtime.sendMessage({ type: "TAB_SWITCHED", tabId });
    */
  });
});
