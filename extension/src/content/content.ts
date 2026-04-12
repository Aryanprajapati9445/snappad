// Content script — injected into every page
// Shows toast notifications from the background worker

function showToast(message: string, success: boolean) {
  // Remove any existing toast
  document.getElementById('kv-toast')?.remove();

  const toast = document.createElement('div');
  toast.id = 'kv-toast';
  toast.textContent = success ? `✅ ${message}` : `❌ ${message}`;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '500',
    color: '#f1f5f9',
    background: success
      ? 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))'
      : 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)',
    border: success ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)',
    transform: 'translateY(10px)',
    opacity: '0',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'pointer',
    minWidth: '220px',
  });

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });
  });

  // Dismiss on click
  toast.addEventListener('click', () => dismissToast(toast));

  // Auto-dismiss after 4s
  setTimeout(() => dismissToast(toast), 4000);
}

function dismissToast(toast: HTMLElement) {
  toast.style.transform = 'translateY(10px)';
  toast.style.opacity = '0';
  setTimeout(() => toast.remove(), 350);
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'VAULT_TOAST') {
    showToast(message.payload.message, message.payload.success);
  }
});
