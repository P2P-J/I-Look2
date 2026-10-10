// Claude 문서(아티팩트) 본문은 claudeusercontent.com 안의 sandbox="allow-scripts" srcdoc iframe에 들어 있다.
// origin이 null이라 manifest의 content_scripts로는 주입되지 않으므로, 프레임이 뜰 때 여기서 직접 넣는다.
chrome.webNavigation.onCommitted.addListener(async (d) => {
  if (d.frameId === 0 || d.url !== 'about:srcdoc') return;
  let parent;
  try {
    parent = await chrome.webNavigation.getFrame({ tabId: d.tabId, frameId: d.parentFrameId });
  } catch (e) {
    return;
  }
  if (!parent || !/\.claudeusercontent\.com$/.test(new URL(parent.url).hostname)) return;
  const target = { tabId: d.tabId, frameIds: [d.frameId] };
  try {
    await chrome.scripting.insertCSS({ target, files: ['adapters/claude.css'] });
    await chrome.scripting.executeScript({ target, files: ['content.js'] });
  } catch (e) {
    console.warn('[ilook] srcdoc inject failed', e.message);
  }
});
