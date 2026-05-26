import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import type { RendererCapabilities } from '../capabilities/detectRendererCapabilities';

export async function createBabylonEngine(
  canvas: HTMLCanvasElement,
  caps: RendererCapabilities
): Promise<Engine> {
  const hardwareScalingLevel = getScalingLevel(caps.deviceTier);

  // Attempt WebGPU engine first
  if (caps.webgpu) {
    try {
      const webgpuEngine = new WebGPUEngine(canvas, {
        stencil: true,
        antialias: true,
      });
      await webgpuEngine.initAsync();
      webgpuEngine.setHardwareScalingLevel(hardwareScalingLevel);
      return webgpuEngine as unknown as Engine;
    } catch {
      // Fall through to WebGL
    }
  }

  // Fall back to WebGL engine
  const engine = new Engine(canvas, true, {
    stencil: true,
    antialias: true,
    preserveDrawingBuffer: false,
    powerPreference: caps.deviceTier === 'low' ? 'low-power' : 'high-performance',
  });

  engine.setHardwareScalingLevel(hardwareScalingLevel);

  return engine;
}

function getScalingLevel(deviceTier: 'low' | 'mid' | 'high'): number {
  switch (deviceTier) {
    case 'high':
      return 1;
    case 'mid':
      return 1.5;
    case 'low':
      return 2;
  }
}
