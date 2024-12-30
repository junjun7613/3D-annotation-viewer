declare module 'three-stdlib' {
    import * as THREE from 'three';
  
    export class OrbitControls extends THREE.EventDispatcher {
      constructor(object: THREE.Camera, domElement?: HTMLElement);
  
      object: THREE.Camera;
      domElement: HTMLElement | Document;
  
      // API
      enabled: boolean;
      target: THREE.Vector3;
  
      // deprecated
      center: THREE.Vector3;
  
      minDistance: number;
      maxDistance: number;
  
      minZoom: number;
      maxZoom: number;
  
      minPolarAngle: number;
      maxPolarAngle: number;
  
      minAzimuthAngle: number;
      maxAzimuthAngle: number;
  
      enableDamping: boolean;
      dampingFactor: number;
  
      enableZoom: boolean;
      zoomSpeed: number;
  
      enableRotate: boolean;
      rotateSpeed: number;
  
      enablePan: boolean;
      panSpeed: number;
      screenSpacePanning: boolean;
      keyPanSpeed: number;
  
      autoRotate: boolean;
      autoRotateSpeed: number;
  
      enableKeys: boolean;
      keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string };
      mouseButtons: {
        LEFT: THREE.MOUSE;
        MIDDLE: THREE.MOUSE;
        RIGHT: THREE.MOUSE;
      };
      touches: { ONE: THREE.TOUCH; TWO: THREE.TOUCH };
  
      target0: THREE.Vector3;
      position0: THREE.Vector3;
      zoom0: number;
  
      saveState(): void;
  
      update(): boolean;
  
      reset(): void;
  
      dispose(): void;
  
      getPolarAngle(): number;
  
      getAzimuthalAngle(): number;
  
      // EventDispatcher mixins
      addEventListener(type: string, listener: (event: any) => void): void;
  
      hasEventListener(type: string, listener: (event: any) => void): boolean;
  
      removeEventListener(type: string, listener: (event: any) => void): void;
  
      dispatchEvent(event: { type: string; target: any }): void;
    }
  
    export class GLTFLoader extends THREE.Loader {
      constructor(manager?: THREE.LoadingManager);
      load(
        url: string,
        onLoad: (gltf: GLTF) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (event: ErrorEvent) => void
      ): void;
      parse(
        data: ArrayBuffer | string,
        path: string,
        onLoad: (gltf: GLTF) => void,
        onError?: (event: ErrorEvent) => void
      ): void;
    }
  
    export class CSS2DRenderer extends THREE.EventDispatcher {
      domElement: HTMLElement;
  
      constructor();
  
      getSize(): { width: number; height: number };
  
      setSize(width: number, height: number): void;
  
      render(scene: THREE.Scene, camera: THREE.Camera): void;
    }
  
    export class CSS2DObject extends THREE.Object3D {
      element: HTMLElement;
  
      constructor(element: HTMLElement);
    }
  }