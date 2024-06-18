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
    //vertex stage
const u_gridDiv = uniform(float(4))
const gl_Position = cameraProjectionMatrix.mul(cameraViewMatrix).mul(modelWorldMatrix).mul(positionLocal)
const worldPosition = vec3(modelWorldMatrix.mul(positionLocal)).xyz;

const v_worldPos = vec2(worldPosition.xz.mul(u_gridDiv));

 // Use local position for grid calculations
const localPos = vec3(positionLocal.xyz);
const cameraCenteringOffset = vec3(floor(cameraPosition));
const cameraSnappedWorldPos = vec3(worldPosition.xyz.sub(cameraCenteringOffset));
const v_uv = cameraSnappedWorldPos.xz.mul(u_gridDiv);

// Calculate derivatives for anti-aliasing
const uvDDXY = vec4(dFdx(v_uv), dFdy(v_uv)).label('uvDDXY');
const uvDeriv = vec2(length(uvDDXY.xz), length(uvDDXY.yw)).label('uvDeriv');

const worldPosDDXY = vec4(dFdx(v_worldPos), dFdy(v_worldPos)).label('worldPosDDXY');
const worldPosDeriv = vec2(length(worldPosDDXY.xz), length(worldPosDDXY.yw)).label('worldPosDeriv');

// Axis lines calculation
const u_majorLineWidth = uniform(float(0.04)).label('u_majorLineWidth');
const u_axisLineWidth = uniform(float(0.15)).label('u_axisLineWidth');
const axisLineWidth = max(u_majorLineWidth, u_axisLineWidth).label('axisLineWidth');

const axisDrawWidth = vec2(axisLineWidth).add(worldPosDeriv).mul(0.5); // Adjust for AA
const axisLineAA = worldPosDeriv.mul(1.5);
const axisLines2 = smoothstep(axisDrawWidth.add(axisLineAA), axisDrawWidth.sub(axisLineAA), abs(v_worldPos.xy.mul(2.0))).mul(axisLineWidth.div(axisDrawWidth));

// Major grid lines
const u_majorGridDiv = uniform(float(10));
const div = max(2.0, round(u_majorGridDiv));
const majorUVDeriv = vec2(worldPosDeriv.div(div));
const majorLineWidth = u_majorLineWidth.div(div);
const majorDrawWidth = clamp(vec2(majorLineWidth), majorUVDeriv, vec2(0.5));
const majorLineAA = majorUVDeriv.mul(1.5);
const majorGridUV = float(1.0).sub(abs(fract(v_worldPos.xy.div(div)).mul(2.0).sub(1.0)));
const majorGrid2 = smoothstep(majorDrawWidth.add(majorLineAA), majorDrawWidth.sub(majorLineAA), majorGridUV).mul(majorLineWidth.div(majorDrawWidth));


// Minor grid lines
const u_minorLineWidth = uniform(float(0.01))
const minorLineWidth = u_minorLineWidth;
const minorInvertLine = bool(minorLineWidth > 0.5).label('minorInvertLine');
const minorTargetWidth = tslFn( ( { minorInvertLine } ) => {

    const result = float(0).toVar()

	If( minorInvertLine.equal(true), () => {

		result.add(1.0).sub(minorLineWidth);

	} ).else( () => {

		result.add(minorLineWidth);

	}  );

	return result;

} );
const minorDrawWidth = clamp(vec2(minorTargetWidth({minorInvertLine})), uvDeriv, vec2(0.5));
const minorLineAA = uvDeriv.mul(1.5);
const minorGridUV = abs(fract(v_uv).mul(2.0).sub(1.0));

const minorGridUVupdated = tslFn( ( { minorInvertLine, minorGridUV } ) => {

    const result = float(0).toVar()

	If( minorInvertLine.equal(true), () => {

		result.add(minorGridUV);

	} ).else( () => {

		result.add(1).min(minorGridUV);

	}  );

	return result;

} );

const minorGrid2 = smoothstep(minorDrawWidth.add(minorLineAA), minorDrawWidth.sub(minorLineAA), minorGridUVupdated({minorInvertLine, minorGridUV })).mul(minorTargetWidth({ minorInvertLine }).div(minorDrawWidth)).label('minorGrid2')

// if ( max(axisLines2.x, axisLines2.y) > 0.) {
//     // If we're drawing axis lines, don't draw grid lines on axis
//     majorGrid2 = vec2(0.);
//     minorGrid2 = vec2(0.);
// }

// Combine minor and major grid lines
const minorGrid = float(mix(minorGrid2.x, 1.0, minorGrid2.y)).label('minorGrid');
const majorGrid = float(mix(majorGrid2.x, 1.0, majorGrid2.y)).label('majorGrid');

// Final color calculations for grid
const u_baseColor = uniform(color('#707070')).label('u_baseColor');
const u_minorLineColor = uniform(color('#f1f1f1')).label('u_minorLineColor');
const u_majorLineColor = uniform(color('#ffffff')).label('u_majorLineColor');
const gridColorSrc = vec3(mix(u_baseColor, u_minorLineColor, minorGrid)).label('gridColorSrc');
const gridColor = mix(gridColorSrc, u_majorLineColor, majorGrid).label('gridColor');
const u_baseAlpha = uniform(float(0.5)).label('u_baseAlpha');
const gridAlpha = float(u_baseAlpha).label('gridAlpha');

// Apply base alpha to the grid lines
// if (minorGrid > 0.0) {
//     gridAlpha = saturate(mix(gridAlpha, 1.0, minorGrid));
// }
// if (majorGrid > 0.0) {
//     gridAlpha = saturate(mix(gridAlpha, 1.0, majorGrid));
// }

// Apply axis color to the axis lines
const u_xAxisColor = uniform(color(1, 0.3, 0.3))
const u_zAxisColor = uniform(color(0.3, 0.3, 1))
const axisColorSrc = vec3(mix(vec3(1.), u_xAxisColor, step(0.5, abs(v_worldPos.x)))).label('axisColorSrc');
const axisColor = vec3(mix(axisColorSrc, u_zAxisColor, step(0.5, abs(v_worldPos.y)))).label('axisColor');


const finalColor = vec3(mix(gridColor, axisColor, max(axisLines2.x, axisLines2.y))).label('finalColor');

// if ( max(axisLines2.x, axisLines2.y) > 0.) {
//     gridAlpha = saturate(mix(gridAlpha, 1.0, max(axisLines2.x, axisLines2.y)));
// }

const output = vec4(finalColor, gridAlpha);
 
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
