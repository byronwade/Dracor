const STORAGE_KEY = 'dracor_chat_history';
const MAX_STORED = 80;
const MAX_DISPLAYED = 50;
const FADE_DELAY_MS = 8000;

interface StoredMessage {
  sender: string;
  content: string;
  type: 'player' | 'system' | 'self';
  time: number;
}

function nameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 55%, 65%)`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function loadHistory(): StoredMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(-MAX_STORED);
  } catch { return []; }
}

function saveHistory(messages: StoredMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch { /* ignore */ }
}

export interface ChatPanel {
  addMessage: (sender: string, content: string) => void;
  addSelfMessage: (sender: string, content: string) => void;
  addSystemMessage: (content: string) => void;
  updatePlayerList: (names: string[]) => void;
  onSend: (callback: (content: string) => void) => void;
  isInputFocused: () => boolean;
  dispose: () => void;
}

export function createChatPanel(): ChatPanel {
  let sendCallback: ((content: string) => void) | null = null;
  let focused = false;
  let messages: StoredMessage[] = loadHistory();
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;
  let unreadCount = 0;
  let activeTab: 'chat' | 'players' = 'chat';
  let userScrolled = false;

  const container = document.getElementById('chat-container') || createContainerEl();
  container.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = `
    #dracor-chat { display:flex; flex-direction:column; height:100%; transition:opacity 0.5s ease; }
    #dracor-chat.faded { opacity:0.25; }
    #dracor-chat .ch-header {
      display:flex; gap:2px; padding:4px 8px; background:rgba(0,0,0,0.82);
      border-radius:8px 8px 0 0; border-bottom:1px solid rgba(255,255,255,0.06);
      font-size:11px; color:#555;
    }
    #dracor-chat .ch-tab {
      cursor:pointer; padding:3px 10px; border-radius:4px; transition:all 0.15s; user-select:none;
    }
    #dracor-chat .ch-tab:hover { color:#aaa; background:rgba(255,255,255,0.04); }
    #dracor-chat .ch-tab.active { color:#f0a050; background:rgba(240,160,80,0.1); }
    #dracor-chat .ch-badge {
      background:#c04820; color:#fff; font-size:9px; font-weight:bold;
      padding:0 5px; border-radius:8px; margin-left:3px; display:none; vertical-align:middle;
    }
    #dracor-chat .ch-pcount { color:#555; font-size:10px; margin-left:2px; }
    #dracor-chat .ch-msgs {
      flex:1; overflow-y:auto; padding:6px 10px; background:rgba(0,0,0,0.6);
      font-size:12px; line-height:1.55; max-height:230px;
      scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.12) transparent;
    }
    #dracor-chat .ch-msg { margin-bottom:1px; display:flex; gap:5px; padding:1px 0; }
    #dracor-chat .ch-msg .ts { color:#3a3a3a; font-size:10px; min-width:34px; flex-shrink:0; padding-top:2px; }
    #dracor-chat .ch-msg .nm { font-weight:700; flex-shrink:0; }
    #dracor-chat .ch-msg .tx { color:#bbb; word-break:break-word; }
    #dracor-chat .ch-msg.sys { font-style:italic; }
    #dracor-chat .ch-msg.sys .tx { color:#5a5a5a; }
    #dracor-chat .ch-msg.me .nm { color:#ddd !important; }
    #dracor-chat .ch-msg.me .tx { color:#ddd; }
    #dracor-chat .ch-plist {
      flex:1; overflow-y:auto; padding:8px 10px; background:rgba(0,0,0,0.6);
      font-size:12px; max-height:230px; display:none;
    }
    #dracor-chat .ch-pe { display:flex; align-items:center; gap:7px; padding:3px 0; color:#999; }
    #dracor-chat .ch-pe .dot { width:6px; height:6px; border-radius:50%; background:#44cc44; flex-shrink:0; }
    #dracor-chat .ch-input {
      display:flex; background:rgba(0,0,0,0.82); border-radius:0 0 8px 8px;
      border-top:1px solid rgba(255,255,255,0.06);
    }
    #dracor-chat .ch-input input {
      flex:1; background:transparent; border:none; outline:none;
      color:#fff; padding:7px 10px; font-size:12px; font-family:inherit;
    }
    #dracor-chat .ch-input input::placeholder { color:#3a3a3a; }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'dracor-chat';
  container.appendChild(root);

  const header = document.createElement('div');
  header.className = 'ch-header';

  const tabChat = document.createElement('span');
  tabChat.className = 'ch-tab active';
  tabChat.textContent = 'Chat';
  const badge = document.createElement('span');
  badge.className = 'ch-badge';
  tabChat.appendChild(badge);

  const tabPlayers = document.createElement('span');
  tabPlayers.className = 'ch-tab';
  tabPlayers.textContent = 'Online';
  const pcount = document.createElement('span');
  pcount.className = 'ch-pcount';
  pcount.textContent = '(0)';
  tabPlayers.appendChild(pcount);

  header.appendChild(tabChat);
  header.appendChild(tabPlayers);
  root.appendChild(header);

  const msgList = document.createElement('div');
  msgList.className = 'ch-msgs';
  root.appendChild(msgList);

  const pList = document.createElement('div');
  pList.className = 'ch-plist';
  root.appendChild(pList);

  const inputRow = document.createElement('div');
  inputRow.className = 'ch-input';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Press Enter to chat...';
  input.maxLength = 200;
  inputRow.appendChild(input);
  root.appendChild(inputRow);

  tabChat.addEventListener('click', () => setTab('chat'));
  tabPlayers.addEventListener('click', () => setTab('players'));

  function setTab(t: 'chat' | 'players'): void {
    activeTab = t;
    tabChat.className = t === 'chat' ? 'ch-tab active' : 'ch-tab';
    tabPlayers.className = t === 'players' ? 'ch-tab active' : 'ch-tab';
    msgList.style.display = t === 'chat' ? 'block' : 'none';
    pList.style.display = t === 'players' ? 'block' : 'none';
    if (t === 'chat') { unreadCount = 0; badge.style.display = 'none'; }
  }

  msgList.addEventListener('scroll', () => {
    userScrolled = msgList.scrollHeight - msgList.scrollTop - msgList.clientHeight > 25;
  });

  input.addEventListener('focus', () => { focused = true; reveal(); });
  input.addEventListener('blur', () => { focused = false; scheduleFade(); });
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input.value.trim();
      if (v && sendCallback) sendCallback(v);
      input.value = '';
    }
    e.stopPropagation();
  });
  input.addEventListener('keyup', (e: KeyboardEvent) => { e.stopPropagation(); });

  function reveal(): void {
    root.classList.remove('faded');
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
  }

  function scheduleFade(): void {
    if (focused) return;
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => root.classList.add('faded'), FADE_DELAY_MS);
  }

  function renderMsg(msg: StoredMessage): void {
    const row = document.createElement('div');
    row.className = msg.type === 'system' ? 'ch-msg sys' : msg.type === 'self' ? 'ch-msg me' : 'ch-msg';

    const ts = document.createElement('span');
    ts.className = 'ts';
    ts.textContent = formatTime(msg.time);
    row.appendChild(ts);

    if (msg.type !== 'system') {
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.style.color = msg.type === 'self' ? '#ddd' : nameColor(msg.sender);
      nm.textContent = msg.sender;
      row.appendChild(nm);
    }

    const tx = document.createElement('span');
    tx.className = 'tx';
    tx.textContent = msg.type === 'system' ? msg.content : ` ${msg.content}`;
    row.appendChild(tx);

    msgList.appendChild(row);
    while (msgList.children.length > MAX_DISPLAYED) msgList.removeChild(msgList.firstChild!);
    if (!userScrolled) msgList.scrollTop = msgList.scrollHeight;
  }

  function push(sender: string, content: string, type: 'player' | 'system' | 'self'): void {
    const msg: StoredMessage = { sender, content, type, time: Date.now() };
    messages.push(msg);
    if (messages.length > MAX_STORED) messages = messages.slice(-MAX_STORED);
    saveHistory(messages);
    renderMsg(msg);
    reveal();
    scheduleFade();

    if (activeTab !== 'chat' && type !== 'self') {
      unreadCount++;
      badge.textContent = String(unreadCount);
      badge.style.display = 'inline';
    }
  }

  for (const msg of messages.slice(-20)) renderMsg(msg);
  scheduleFade();

  return {
    addMessage(sender: string, content: string) { push(sender, content, 'player'); },
    addSelfMessage(sender: string, content: string) { push(sender, content, 'self'); },
    addSystemMessage(content: string) { push('', content, 'system'); },
    updatePlayerList(names: string[]) {
      pcount.textContent = `(${names.length})`;
      pList.innerHTML = '';
      for (const n of names) {
        const entry = document.createElement('div');
        entry.className = 'ch-pe';
        const dot = document.createElement('div');
        dot.className = 'dot';
        const nameEl = document.createElement('span');
        nameEl.textContent = n;
        nameEl.style.color = nameColor(n);
        entry.appendChild(dot);
        entry.appendChild(nameEl);
        pList.appendChild(entry);
      }
    },
    onSend(cb: (c: string) => void) { sendCallback = cb; },
    isInputFocused() { return focused; },
    dispose() { style.remove(); container.innerHTML = ''; },
  };
}

function createContainerEl(): HTMLElement {
  const c = document.createElement('div');
  c.id = 'chat-container';
  c.style.cssText = `position:absolute;bottom:16px;left:16px;width:380px;max-height:320px;display:flex;flex-direction:column;pointer-events:none;z-index:100;`;
  const s = document.createElement('style');
  s.textContent = '#chat-container > * { pointer-events: auto; }';
  document.head.appendChild(s);
  document.body.appendChild(c);
  return c;
}
