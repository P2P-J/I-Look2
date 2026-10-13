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
  let host = '';
  try { host = new URL(parent?.url || '').hostname; } catch (e) { return; }
  if (!/\.claudeusercontent\.com$/.test(host)) return;
  const target = { tabId: d.tabId, frameIds: [d.frameId] };
  try {
    await chrome.scripting.insertCSS({ target, files: ['adapters/claude.css', 'adapters/syntax.css'] });
    await chrome.scripting.executeScript({ target, files: ['content.js'], injectImmediately: true });
  } catch (e) {
    console.warn('[ilook] srcdoc inject failed', e.message);
  }
});
