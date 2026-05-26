import { createChatPanel, type ChatPanel } from '../ui/createChatPanel';

export class ChatController {
  private panel: ChatPanel;

  constructor() {
    this.panel = createChatPanel();
  }

  onSend(callback: (content: string) => void): void {
    this.panel.onSend(callback);
  }

  addMessage(sender: string, content: string): void {
    this.panel.addMessage(sender, content);
  }

  addSelfMessage(sender: string, content: string): void {
    this.panel.addSelfMessage(sender, content);
  }

  addSystemMessage(content: string): void {
    this.panel.addSystemMessage(content);
  }

  updatePlayerList(names: string[]): void {
    this.panel.updatePlayerList(names);
  }

  isInputFocused(): boolean {
    return this.panel.isInputFocused();
  }

  dispose(): void {
    this.panel.dispose();
  }
}
