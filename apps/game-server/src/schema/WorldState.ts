import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { ChatState } from "./ChatState";

export class WorldState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type([ChatState]) messages = new ArraySchema<ChatState>();
  @type("uint64") worldTime: number = 0;
  @type("uint32") tick: number = 0;
  @type("string") currentZone: string = "ironvale_town";
  @type("string") zoneName: string = "Ironvale";
}
