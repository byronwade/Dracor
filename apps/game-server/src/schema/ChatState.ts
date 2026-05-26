import { Schema, type } from "@colyseus/schema";

export class ChatState extends Schema {
  @type("string") id: string = "";
  @type("string") senderId: string = "";
  @type("string") senderName: string = "";
  @type("string") content: string = "";
  @type("uint64") timestamp: number = 0;
}
