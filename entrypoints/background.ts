/**
 * Service worker.
 *
 * Responsibilities:
 *   1. Strip X-Frame-Options + CSP for sub_frame requests initiated by the
 *      extension's panel page. Scope: `initiatorDomains: [extension ID]` —
 *      Chrome treats `chrome-extension://EXT_ID` as the initiator host for
 *      requests originating from the extension's own pages, so this matches
 *      panel iframes only and not the user's normal browsing.
 *   2. Open the panel tab when the toolbar action is clicked.
 *   3. Capture the visible tab on demand for screenshots (panel does the
 *      per-frame cropping client-side).
 *
 * Sync-scroll is handled in-page via window.postMessage between the panel
 * and the iframe-bridge content script — no service-worker hop needed.
 */

const HEADER_RULE_ID = 1;

export default defineBackground(() => {
  installHeaderRule();

  chrome.action.onClicked.addListener(async tab => {
    const target = tab?.url && /^https?:/.test(tab.url) ? tab.url : '';
    const panelUrl =
      chrome.runtime.getURL('panel.html') +
      (target ? `?url=${encodeURIComponent(target)}` : '');
    await chrome.tabs.create({ url: panelUrl });
  });

  chrome.runtime.onMessage.addListener((msg, _sender, send) => {
    if (msg?.type === 'capture') {
      handleCapture(send);
      return true;
    }
    return false;
  });
});

function installHeaderRule(): void {
  void chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [HEADER_RULE_ID],
    addRules: [
      {
        id: HEADER_RULE_ID,
        priority: 1,
        action: {
          type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
          responseHeaders: [
            { header: 'x-frame-options', operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation },
            { header: 'content-security-policy', operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation },
            { header: 'content-security-policy-report-only', operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation },
          ],
        },
        condition: {
          resourceTypes: ['sub_frame' as chrome.declarativeNetRequest.ResourceType],
          initiatorDomains: [chrome.runtime.id],
        },
      },
    ],
  });
}

async function handleCapture(send: (response: unknown) => void) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    send({ ok: true, dataUrl });
  } catch (err) {
    send({ ok: false, error: String(err) });
  }
}
