import { Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") userId: string = "";
  @type("string") characterId: string = "";
  @type("string") name: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") z: number = 0;
  @type("float32") yaw: number = 0;
  @type("int16") health: number = 100;
  @type("int16") maxHealth: number = 100;
  @type("int8") level: number = 1;
  @type("string") weapon: string = "blade";
  @type("string") memory: string = "ember";
  @type("boolean") isMoving: boolean = false;
  @type("uint32") lastInputSeq: number = 0;
}
