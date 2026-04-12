import { api } from '../lib/api';
import { getToken } from '../lib/storage';

// Register context menus on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to Snappad',
    contexts: ['page', 'frame'],
  });

  chrome.contextMenus.create({
    id: 'save-selection',
    title: 'Save selection to Snappad',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to Snappad',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'save-image',
    title: 'Save image to Snappad',
    contexts: ['image'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const token = await getToken();
  if (!token) {
    // Open popup so user can log in
    chrome.action.openPopup?.();
    return;
  }

  try {
    let payload: Record<string, unknown> | null = null;

    if (info.menuItemId === 'save-page' && tab?.url) {
      payload = {
        type: 'link',
        content: tab.url,
        title: tab.title || '',
      };
    } else if (info.menuItemId === 'save-selection' && info.selectionText) {
      payload = {
        type: 'text',
        content: info.selectionText,
      };
    } else if (info.menuItemId === 'save-link' && info.linkUrl) {
      payload = {
        type: 'link',
        content: info.linkUrl,
      };
    } else if (info.menuItemId === 'save-image' && info.srcUrl) {
      payload = {
        type: 'link',
        content: info.srcUrl,
        title: 'Image from ' + (tab?.title ?? ''),
      };
    }

    if (payload) {
      await api.post('/content', payload);
      // Notify the content script to show a toast
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'VAULT_TOAST',
          payload: { success: true, message: 'Saved to Snappad!' },
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save';
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'VAULT_TOAST',
        payload: { success: false, message },
      });
    }
  }
});

// Handle messages from popup / content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_CONTENT') {
    api.post('/content', message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((err: unknown) =>
        sendResponse({ success: false, message: err instanceof Error ? err.message : 'Error' })
      );
    return true; // keep channel open for async response
  }
});
