import { Object3D } from 'three';
import dispatcher from '@/canvas/utils/dispatcher.js';

import camera from '@/canvas/camera';
import { component } from '@/canvas/dispatcher';
import loader from '@/canvas/loader';
import renderer from '@/canvas/renderer';
import scene from '@/canvas/scene';
import { SuzanneTSL } from '@/canvas/meshes/Suzanne/SuzanneTSL';
import { GridTSL } from '@/canvas/meshes/Grid/GridTSL';
import { GridTSLDebug } from './canvas/meshes/Grid/GridTSLDebug';
// import postfx from '@/canvas/postfx/postfx';

let stats = null;

// disable auto update
Object3D.DEFAULT_MATRIX_AUTO_UPDATE = false;
Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = false;

class Site extends component(null, {
  raf: {
    renderPriority: Infinity, // always render in last the loop
    fps: Infinity, // no throttle to the render RAF
  },
}) {
  init() {
    loader.load();
    document.body.appendChild(renderer.domElement);
  }

  onRaf() {
    renderer.render(scene, camera);
    // postprocess
    // postfx.render(scene, camera);
  }
  onAfterRaf() {
    if (!stats) return
    stats.update();
  }
  onDebug() {
    if (stats) {
      document.body.appendChild(stats.dom);
      stats.init(renderer);
    }
  }
  onLoadEnd() {
    // new Grid()
    // new GridTSL()
    new GridTSLDebug()
    // new Suzanne()
    new SuzanneTSL()
  }
}

function init({ debug = false } = {}) {
  // Use debugMode to control debug-specific features
  if (debug) {
    console.log('🏗️ Debug mode is enabled');

    import('stats-gl').then((module) => {
      stats = new module.default();

      import('lil-gui').then((module) => {
        const gui = new module.GUI();
        // Do something with gui

        dispatcher.trigger(
          { name: 'debug', fireAtStart: true },
          {
            gui,
          }
        );
      });
    });
  }

  const site = new Site();
  return site;
}

export { init, dispatcher };
