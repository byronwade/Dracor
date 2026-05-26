/**
 * Chat panel: message list + input field.
 * DOM-based, dark semi-transparent styling.
 */
export interface ChatPanel {
  addMessage: (sender: string, content: string) => void;
  addSystemMessage: (content: string) => void;
  onSend: (callback: (content: string) => void) => void;
  isInputFocused: () => boolean;
  dispose: () => void;
}

export function createChatPanel(): ChatPanel {
  const MAX_MESSAGES = 30;
  let sendCallback: ((content: string) => void) | null = null;
  let focused = false;

  // Main container
  const container = document.getElementById('chat-container') || createContainer();
  container.innerHTML = ''; // Clear any existing content

  // Message list
  const messageList = document.createElement('div');
  messageList.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 8px 8px 0 0;
    max-height: 200px;
    font-size: 13px;
    color: #e0e0e0;
    line-height: 1.6;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.2) transparent;
  `;
  container.appendChild(messageList);

  // Input wrapper
  const inputWrapper = document.createElement('div');
  inputWrapper.style.cssText = `
    display: flex;
    background: rgba(0, 0, 0, 0.75);
    border-radius: 0 0 8px 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Press Enter to chat...';
  input.maxLength = 200;
  input.style.cssText = `
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    padding: 8px 12px;
    font-size: 13px;
    font-family: inherit;
  `;

  input.addEventListener('focus', () => { focused = true; });
  input.addEventListener('blur', () => { focused = false; });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const content = input.value.trim();
      if (content && sendCallback) {
        sendCallback(content);
      }
      input.value = '';
    }
    // Stop propagation so game input doesn't fire while typing
    e.stopPropagation();
  });

  input.addEventListener('keyup', (e: KeyboardEvent) => {
    e.stopPropagation();
  });

  inputWrapper.appendChild(input);
  container.appendChild(inputWrapper);

  // Messages array for limiting
  let messageCount = 0;

  function addMessageElement(el: HTMLElement): void {
    messageList.appendChild(el);
    messageCount++;
    // Prune old messages
    while (messageCount > MAX_MESSAGES && messageList.firstChild) {
      messageList.removeChild(messageList.firstChild);
      messageCount--;
    }
    messageList.scrollTop = messageList.scrollHeight;
  }

  // Add welcome message
  const welcome = document.createElement('div');
  welcome.style.cssText = 'margin-bottom: 4px; color: #8a8a8a; font-style: italic;';
  welcome.textContent = 'Welcome to Ironvale. Press Enter to chat, WASD to move.';
  addMessageElement(welcome);

  return {
    addMessage(sender: string, content: string) {
      const msgEl = document.createElement('div');
      msgEl.style.marginBottom = '4px';

      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'color: #f0a050; font-weight: bold; margin-right: 6px;';
      nameSpan.textContent = `${sender}:`;

      const contentSpan = document.createElement('span');
      contentSpan.style.color = '#e0e0e0';
      contentSpan.textContent = content;

      msgEl.appendChild(nameSpan);
      msgEl.appendChild(contentSpan);
      addMessageElement(msgEl);
    },

    addSystemMessage(content: string) {
      const msgEl = document.createElement('div');
      msgEl.style.cssText = 'margin-bottom: 4px; color: #8a8a8a; font-style: italic;';
      msgEl.textContent = content;
      addMessageElement(msgEl);
    },

    onSend(callback: (content: string) => void) {
      sendCallback = callback;
    },

    isInputFocused() {
      return focused;
    },

    dispose() {
      container.innerHTML = '';
    },
  };
}

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'chat-container';
  container.style.cssText = `
    position: absolute;
    bottom: 16px;
    left: 16px;
    width: 360px;
    max-height: 280px;
    display: flex;
    flex-direction: column;
    pointer-events: none;
  `;
  // Allow child pointer events
  const style = document.createElement('style');
  style.textContent = '#chat-container > * { pointer-events: auto; }';
  document.head.appendChild(style);
  document.body.appendChild(container);
  return container;
}
