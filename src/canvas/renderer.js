import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';
import { component } from '@/canvas/dispatcher';
import settings from '@/canvas/settings';

class Renderer extends component(WebGPURenderer) {
  constructor() {
    super({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
    });

    this.setPixelRatio(settings.dpr);
  }

  onResize({ width, height }) {
    this.setSize(width, height);
  }
}

export default new Renderer();
