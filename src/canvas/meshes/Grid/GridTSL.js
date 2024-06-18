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

export class GridTSL extends component(Object3D, {
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
    const uvDDXY = vec4(dFdx(v_uv), dFdy(v_uv));
    const uvDeriv = vec2(length(uvDDXY.xz), length(uvDDXY.yw));

    const worldPosDDXY = vec4(dFdx(v_worldPos), dFdy(v_worldPos));
    const worldPosDeriv = vec2(length(worldPosDDXY.xz), length(worldPosDDXY.yw));

    // Axis lines calculation
    // todo adding label break the dynamic update of the uniform
    const u_majorLineWidth = uniform(float(0.04))
    const u_axisLineWidth = uniform(float(0.15));
    const axisLineWidth = max(u_majorLineWidth, u_axisLineWidth)

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
    const minorInvertLine = bool(minorLineWidth.greaterThan(0.5));
    const minorTargetWidth = cond( minorInvertLine.equal( true ), float(1.0).sub(minorLineWidth), minorLineWidth );
    console.log('minorTargetWidth',minorTargetWidth)
    console.log('minorTargetWidth.nodeType',minorTargetWidth.nodeType)
    console.log('uvDeriv.nodeType',uvDeriv.nodeType)
    const minorDrawWidth = clamp(vec2(minorTargetWidth), uvDeriv, vec2(0.5));
    const minorLineAA = uvDeriv.mul(1.5);
    const minorGridUV_ = abs(fract(v_uv).mul(2.0).sub(1.0));
    const minorGridUV = cond( minorInvertLine.equal( true ), minorGridUV_, float(1.0).sub(minorGridUV_) )

    const minorGrid2 = smoothstep(minorDrawWidth.add(minorLineAA), minorDrawWidth.sub(minorLineAA), minorGridUV).mul(minorTargetWidth.div(minorDrawWidth))

    const majorGrid3 = cond(max(axisLines2.x, axisLines2.y).greaterThan(0),vec2(0.0),majorGrid2);
    const minorGrid3 = cond(max(axisLines2.x, axisLines2.y).greaterThan(0),vec2(0.0),minorGrid2);

    // Combine minor and major grid lines
    const minorGrid = float(mix(minorGrid3.x, 1.0, minorGrid3.y));
    const majorGrid = float(mix(majorGrid3.x, 1.0, majorGrid3.y));

    // Final color calculations for grid
    const u_baseColor = uniform(color('#707070'))
    const u_minorLineColor = uniform(color('#f1f1f1'))
    const u_majorLineColor = uniform(color('#ffffff'))
    const gridColorSrc = vec3(mix(u_baseColor, u_minorLineColor, minorGrid))
    const gridColor = mix(gridColorSrc, u_majorLineColor, majorGrid)
    const u_baseAlpha = uniform(float(0.5))
    const gridAlpha = float(u_baseAlpha)

    const saturate = tslFn(({ value }) => {
      return clamp(value, 0.0, 1.0);
    })

    const ifMGrid = tslFn( ( { gridAlpha, minorGrid, majorGrid } ) => {

      // Apply base alpha to the grid lines
      If( minorGrid.greaterThan(0), () => {

        gridAlpha = saturate({ value: mix(gridAlpha, 1.0, minorGrid) })

      } )
      If( majorGrid.greaterThan(0), () => {

        gridAlpha = saturate({ value: mix(gridAlpha, 1.0, majorGrid) })

      } )

      return gridAlpha

    } );

    const gridAlpha2 = ifMGrid({ gridAlpha, minorGrid, majorGrid })

    // Apply axis color to the axis lines
    const u_xAxisColor = uniform(color(1, 0.3, 0.3))
    const u_zAxisColor = uniform(color(0.3, 0.3, 1))
    const axisColorSrc = vec3(mix(vec3(1.), u_xAxisColor, step(0.5, abs(v_worldPos.x))));
    const axisColor = vec3(mix(axisColorSrc, u_zAxisColor, step(0.5, abs(v_worldPos.y))));

    const finalColor = vec3(mix(gridColor, axisColor, max(axisLines2.x, axisLines2.y)));

    const ifAxis = tslFn( ( { axisLines2, gridAlpha } ) => {

      If( max(axisLines2.x, axisLines2.y).greaterThan(0), () => {

        gridAlpha = saturate(mix(gridAlpha, 1.0, max(axisLines2.x, axisLines2.y)));

      } )

      return gridAlpha

    } );

    const output = vec4(finalColor, ifAxis({ axisLines2, gridAlpha:gridAlpha2 }))

    console.log('output',output)
    this.material.fragmentNode = output;
    this.material.side = DoubleSide;
    this.material.transparent = true;
    this.material.needsUpdate = true;

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.updateMatrix();
    this.mesh.matrixWorld.copy(this.matrixWorld);

    this.add(this.mesh);
    scene.add(this);

    this.u_majorLineWidth = u_majorLineWidth;
    this.u_minorLineWidth= u_minorLineWidth;
    this.u_axisLineWidth= u_axisLineWidth;
    this.u_gridDiv= u_gridDiv;
    this.u_majorGridDiv= u_majorGridDiv;
    this.u_baseAlpha= u_baseAlpha;
    this.u_baseColor= u_baseColor;
    this.u_majorLineColor=u_majorLineColor;
    this.u_minorLineColor=u_minorLineColor;
    this.u_xAxisColor=u_xAxisColor;
    this.u_zAxisColor=u_zAxisColor;
  }
  onDebug({ gui }) {
    this.gui = gui.addFolder('Grid');
    console.log(this.material)
    console.log('this.u_majorLineWidth',this.u_majorLineWidth)
    console.log(this.u_majorLineWidth.value)
    this.gui
       .add(this.config, 'u_majorLineWidth', 0, 1)
       .onChange((value) => {
        console.log('value',value)
         this.u_majorLineWidth.value = value;
      });
      this.gui
        .add(this.config, 'u_minorLineWidth', 0, 0.5)
        .onChange((value) => {
          this.u_minorLineWidth.value = value;
      });
      this.gui
        .add(this.config, 'u_axisLineWidth', 0, 1)
        .onChange((value) => {
          this.u_axisLineWidth.value = value;
      }).name('Grid Div');
      this.gui
        .add(this.config, 'u_gridDiv', 1, 20, 1)
        .onChange((value) => {
          this.u_gridDiv.value = value;
      }).name('Axis Line Width');
      this.gui
        .add(this.config, 'u_majorGridDiv', 1, 50, 1)
        .onChange((value) => {
          this.u_majorGridDiv.value = value;
      }).name('Major Grid Div');
      this.gui
        .add(this.config, 'u_baseAlpha', 0, 1)
        .onChange((value) => {
          this.u_baseAlpha.value = value;
      }).name('Base Alpha');
      this.gui
      .addColor(this.config, 'baseColor')
      .onChange((value) => {
        this.u_baseColor.value = new Color(value);
      })
      .name('Base Color');
      this.gui
        .addColor(this.config, 'majorLineColor')
        .onChange((value) => {
          this.u_majorLineColor.value = new Color(value);
        })
        .name('Major Line Color');

      this.gui
        .addColor(this.config, 'minorLineColor')
        .onChange((value) => {
          this.u_minorLineColor.value = new Color(value);
        })
        .name('Minor Line Color');

      this.gui
        .addColor(this.config, 'xAxisColor')
        .onChange((value) => {
          this.u_xAxisColor.value = new Color(value);
        })
        .name('X Axis Color');

      this.gui
        .addColor(this.config, 'zAxisColor')
        .onChange((value) => {
          this.u_zAxisColor.value = new Color(value);
        })
        .name('Z Axis Color');
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
    updateComponentRegistry('GridTSL', newModule);
  });
}
