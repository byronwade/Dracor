import type { PlayerState } from "../schema/PlayerState";
import { MAX_MOVE_SPEED, MAX_SPRINT_SPEED } from "@dracor/netcode";
import { clampToWorldBounds } from "./worldBounds";

export function simulatePlayerMovement(
  player: PlayerState,
  input: {
    moveX: number;
    moveZ: number;
    yaw: number;
    sprint: boolean;
    jump: boolean;
    dt: number;
  },
  getTerrainHeight: (x: number, z: number) => number
): void {
  const { moveX, moveZ, yaw, sprint, dt } = input;

  const hasMoveInput = Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001;

  if (hasMoveInput) {
    const speed = sprint ? MAX_SPRINT_SPEED : MAX_MOVE_SPEED;

    // Calculate direction relative to yaw
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    // Transform input direction by yaw rotation
    const dirX = moveX * cosYaw + moveZ * sinYaw;
    const dirZ = -moveX * sinYaw + moveZ * cosYaw;

    // Normalize if magnitude exceeds 1
    const mag = Math.sqrt(dirX * dirX + dirZ * dirZ);
    const normX = mag > 1 ? dirX / mag : dirX;
    const normZ = mag > 1 ? dirZ / mag : dirZ;

    // Apply movement
    const newX = player.x + normX * speed * dt;
    const newZ = player.z + normZ * speed * dt;

    // Sample terrain height at the new position
    const terrainY = getTerrainHeight(newX, newZ);

    // Clamp to world bounds
    const clamped = clampToWorldBounds(newX, terrainY, newZ);
    player.x = clamped.x;
    player.y = clamped.y;
    player.z = clamped.z;
  }

  // Always update yaw from input
  player.yaw = yaw;

  // Update isMoving flag
  player.isMoving = hasMoveInput;
}
