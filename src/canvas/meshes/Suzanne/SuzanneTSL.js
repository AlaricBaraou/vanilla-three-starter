import { Mesh, Object3D } from 'three';
import * as THREE from "three";
import {
  MeshBasicNodeMaterial,
  abs,
  color,
  mix,
  modelWorldMatrix,
  positionLocal,
  sin,
  timerLocal,
  vec3,
  vec4,
} from "three/nodes";
import { component, updateComponentRegistry } from '@/canvas/dispatcher';
import loader from '@/canvas/loader';
import renderer from '@/canvas/renderer';
import scene from '@/canvas/scene';


export class SuzanneTSL extends component(Object3D, {
  raf: {
    renderPriority: 1,
    fps: 120,
  },
}) {
  init() {
    const _scene = loader.resources.suzanne.asset;
    const geometry = _scene.scene.children[0].geometry;
    this.geometry = geometry;

    const img = loader.resources.matcap.asset;

    const waterMaterial = new MeshBasicNodeMaterial();

    const wavesLowColor = color("#02314d");
    const wavesHighColor = color("#9bd8ff");
    const wavesColorOffset = 0.5;
    const wavesColorMultiplier = 1.2;

    const waterColor = mix(
      wavesLowColor,
      wavesHighColor,
      1
    );

    waterMaterial.colorNode = waterColor;

    console.log(THREE.REVISION);

    this.material = waterMaterial;

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.x = 0
    this.mesh.updateMatrix();
    this.mesh.matrixAutoUpdate = false;
    this.add(this.mesh);
    scene.add(this);
  }
  onDebug({ gui }) {
    this.gui = gui.addFolder('Suzanne');
    this.gui.add(this.raf, 'fps', 1, 120, 1);
  }
  onThrottle({ delta, elapsedTime }) {
    if (!this.mesh) {
      return;
    }
    this.mesh.rotation.x += 0.3 * delta;
    this.mesh.rotation.y += 0.3 * delta;
    this.mesh.position.y = Math.sin(elapsedTime * 0.001) + 0.5;
    this.mesh.updateMatrix();
  }
  dispose() {
    super.dispose();
    if (this.gui) {
      this.gui.destroy();
    }
  }
}

// Minimal HMR setup
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    updateComponentRegistry('SuzanneTSL', newModule);
  });
}
