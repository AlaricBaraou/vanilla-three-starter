import {
  Color,
  DoubleSide,
  GLSL3,
  Mesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';

import {
  MeshBasicNodeMaterial,
  NodeMaterial,
  texture, uniform, vec2, vec3, vec4, uv, oscSine, timerLocal, dFdx, dFdy, length, max, smoothstep,
        clamp, fract, round, abs, step, mix, cameraProjectionMatrix, cameraPosition, floor, cameraViewMatrix,
        modelWorldMatrix, positionLocal, float, bool, tslFn, If, color, cond 
} from "three/nodes";

import { component, updateComponentRegistry } from '@/canvas/dispatcher';
import renderer from '@/canvas/renderer';
import scene from '@/canvas/scene';

export class GridTSLDebug extends component(Object3D, {
  raf: {
    renderPriority: 1,
    fps: Infinity,
  },
}) {
  init() {
    this.config = {
      baseColor: '#707070',
      majorLineColor: '#ffffff',
      minorLineColor: '#f1f1f1',
      xAxisColor: '#ff0000',
      zAxisColor: '#0000ff',
      u_majorLineWidth:0.04,
      u_minorLineWidth:0.01,
      u_axisLineWidth:0.15,
      u_gridDiv:4.0,
      u_majorGridDiv:10.0,
      u_baseAlpha:0.5,
    };
    this.geometry = new PlaneGeometry(10000, 10000, 2, 2);
    this.material = new NodeMaterial();

    // Final color calculations for grid
    const u_baseColor = uniform(color('#707070')).label('BaseColor');
 
    const output = vec4(u_baseColor, 1)

    console.log('output',output)
    this.material.fragmentNode = output;
    this.material.side = DoubleSide;
    this.material.needsUpdate = true;

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.updateMatrix();
    this.mesh.matrixWorld.copy(this.matrixWorld);

    this.add(this.mesh);
    scene.add(this);

  
    this.u_baseColor= u_baseColor;
  }
  onDebug({ gui }) {
    this.gui = gui.addFolder('Grid debug');
    console.log(this.material)

      this.gui
      .addColor(this.config, 'baseColor')
      .onChange((value) => {
        console.log('this.u_baseColor',this.u_baseColor)
        console.log('this.u_baseColor.value',this.u_baseColor.value)
        this.u_baseColor.node.value = new Color(value);
      })
      .name('Base Color');

  }
  onRaf() { }
  onResize() { }
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
    updateComponentRegistry('GridTSLDebug', newModule);
  });
}
