export interface RendererCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  webgl1: boolean;
  maxTextureSize: number;
  maxDrawBuffers: number;
  floatTextures: boolean;
  instancedArrays: boolean;
  deviceTier: 'low' | 'mid' | 'high';
  estimatedVRAM: number;
}

export async function detectRendererCapabilities(
  canvas: HTMLCanvasElement
): Promise<RendererCapabilities> {
  const caps: RendererCapabilities = {
    webgpu: false,
    webgl2: false,
    webgl1: false,
    maxTextureSize: 0,
    maxDrawBuffers: 0,
    floatTextures: false,
    instancedArrays: false,
    deviceTier: 'low',
    estimatedVRAM: 0,
  };

  // Detect WebGPU
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const gpu = (navigator as unknown as { gpu: GPU }).gpu;
      const adapter = await gpu.requestAdapter();
      if (adapter) {
        caps.webgpu = true;
        // Estimate VRAM from adapter limits
        const maxBufferSize = adapter.limits.maxBufferSize ?? 0;
        caps.estimatedVRAM = Math.round(maxBufferSize / (1024 * 1024));
        if (caps.estimatedVRAM === 0) {
          // Fallback estimate for WebGPU-capable devices
          caps.estimatedVRAM = 2048;
        }
        caps.maxTextureSize = adapter.limits.maxTextureDimension2D ?? 8192;
        caps.maxDrawBuffers = adapter.limits.maxColorAttachments ?? 8;
        caps.floatTextures = true;
        caps.instancedArrays = true;
      }
    } catch {
      // WebGPU not available or failed
    }
  }

  // Detect WebGL2
  if (!caps.webgpu || caps.maxTextureSize === 0) {
    const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (gl2) {
      caps.webgl2 = true;
      caps.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) as number;
      caps.maxDrawBuffers = gl2.getParameter(gl2.MAX_DRAW_BUFFERS) as number;
      caps.floatTextures = gl2.getExtension('EXT_color_buffer_float') !== null;
      caps.instancedArrays = true; // Built-in for WebGL2

      // Estimate VRAM from renderer info
      const debugExt = gl2.getExtension('WEBGL_debug_renderer_info');
      if (debugExt) {
        const renderer = gl2.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) as string;
        caps.estimatedVRAM = estimateVRAMFromRenderer(renderer);
      }
      if (caps.estimatedVRAM === 0) {
        caps.estimatedVRAM = 1024; // Default 1GB for WebGL2 devices
      }

      // Lose context to release resources
      const loseCtx = gl2.getExtension('WEBGL_lose_context');
      if (loseCtx) {
        loseCtx.loseContext();
      }
    } else {
      // Detect WebGL1
      const gl1 = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (gl1) {
        caps.webgl1 = true;
        caps.maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE) as number;
        caps.maxDrawBuffers = 1;
        caps.floatTextures = gl1.getExtension('OES_texture_float') !== null;
        caps.instancedArrays =
          gl1.getExtension('ANGLE_instanced_arrays') !== null;
        caps.estimatedVRAM = 512;

        const loseCtx = gl1.getExtension('WEBGL_lose_context');
        if (loseCtx) {
          loseCtx.loseContext();
        }
      }
    }
  }

  // Determine device tier
  caps.deviceTier = determineDeviceTier(caps);

  return caps;
}

function determineDeviceTier(
  caps: RendererCapabilities
): 'low' | 'mid' | 'high' {
  if (caps.webgpu) {
    return 'high';
  }
  if (caps.webgl2 && caps.floatTextures && caps.maxTextureSize >= 8192) {
    return 'high';
  }
  if (caps.webgl2 && caps.maxTextureSize >= 4096) {
    return 'mid';
  }
  return 'low';
}

function estimateVRAMFromRenderer(renderer: string): number {
  const lower = renderer.toLowerCase();
  // High-end GPUs
  if (
    lower.includes('rtx 40') ||
    lower.includes('rtx 30') ||
    lower.includes('radeon rx 7') ||
    lower.includes('radeon rx 6')
  ) {
    return 8192;
  }
  if (
    lower.includes('rtx 20') ||
    lower.includes('gtx 1080') ||
    lower.includes('gtx 1070')
  ) {
    return 4096;
  }
  // Mid-range GPUs
  if (
    lower.includes('gtx 1060') ||
    lower.includes('gtx 1050') ||
    lower.includes('radeon rx 5')
  ) {
    return 2048;
  }
  // Integrated / mobile
  if (lower.includes('intel') || lower.includes('apple')) {
    return 1536;
  }
  return 0;
}
