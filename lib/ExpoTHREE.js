import { NativeModules } from "react-native";
import "react-native-console-time-polyfill";

const THREE = global.THREE || require("three");
global.THREE = THREE;

// Ignore yellow box warnings for now since they often have to do
// with GL extensions that we know we don't support.

console.ignoredYellowBox = ["THREE.WebGLRenderer", "THREE.WebGLProgram"];

// THREE.js tries to add some event listeners to the window, for now
// just ignore them.

if (!window.addEventListener) {
  window.addEventListener = () => {};
}

export const createRenderer = ({ gl, ...extra }) =>
  new THREE.WebGLRenderer({
    ...extra,
    canvas: {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      clientHeight: gl.drawingBufferHeight
    },
    context: gl
  });

export const createTextureAsync = async ({ asset }) => {
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const texture = new THREE.Texture();
  texture.image = {
    data: asset,
    width: asset.width,
    height: asset.height
  };
  texture.needsUpdate = true;
  texture.isDataTexture = true; // Forces passing to `gl.texImage2D(...)` verbatim
  texture.minFilter = THREE.LinearFilter; // Pass-through non-power-of-two
  return texture;
};

export const createARCamera = (arSession, width, height, near, far) => {
  const camera = new THREE.PerspectiveCamera();

  camera.width = width;
  camera.height = height;
  camera.aspect = height > 0 ? width / height : 0;
  camera.near = near;
  camera.far = far;

  camera.updateMatrixWorld = () => {
    if (width > 0 && height > 0) {
      const matrices = NativeModules.ExponentGLViewManager.getARMatrices(
        arSession.sessionId,
        camera.width,
        camera.height,
        camera.near,
        camera.far
      );
      if (matrices && matrices.viewMatrix) {
        camera.matrixWorldInverse.fromArray(matrices.viewMatrix);
        camera.matrixWorld.getInverse(camera.matrixWorldInverse);
        camera.projectionMatrix.fromArray(matrices.projectionMatrix);
      }
    }
  };

  camera.updateProjectionMatrix = () => {
    camera.updateMatrixWorld();
  };

  return camera;
};

export const createARBackgroundTexture = (arSession, renderer) => {
  const texture = new THREE.Texture();
  const properties = renderer.properties.get(texture);
  properties.__webglInit = true;
  properties.__webglTexture = new WebGLTexture(arSession.capturedImageTexture);
  return texture;
};

export { default as loadAsync } from "./loadAsync";
export { default as utils } from "./utils";