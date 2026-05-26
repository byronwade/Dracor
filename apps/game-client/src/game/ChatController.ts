import { createChatPanel, type ChatPanel } from '../ui/createChatPanel';

/**
 * Manages the chat UI and relays messages to/from the network layer.
 */
export class ChatController {
  private panel: ChatPanel;

  constructor() {
    this.panel = createChatPanel();
  }

  /**
   * Register a callback for when the local player sends a chat message.
   */
  onSend(callback: (content: string) => void): void {
    this.panel.onSend(callback);
  }

  /**
   * Display an incoming chat message.
   */
  addMessage(sender: string, content: string): void {
    this.panel.addMessage(sender, content);
  }

  /**
   * Display a system/info message.
   */
  addSystemMessage(content: string): void {
    this.panel.addSystemMessage(content);
  }

  /**
   * Whether the chat input field currently has keyboard focus.
   */
  isInputFocused(): boolean {
    return this.panel.isInputFocused();
  }

  dispose(): void {
    this.panel.dispose();
  }
}
