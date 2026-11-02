chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'open-manager') chrome.runtime.openOptionsPage();
});
