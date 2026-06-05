'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import { DRACOLoader } from 'three-stdlib';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { gsap } from 'gsap';

import db from '@/lib/firebase/firebase';
import { addDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { useSetAtom } from 'jotai';
import { infoPanelAtom, regionPanelAtom } from '@/app/atoms/infoPanelAtom';

// uuidをインポート
import { v4 as uuidv4 } from 'uuid';


interface ThreeCanvasProps {
  annotationsVisible: boolean;
  annotationMode: boolean;
  manifestUrl: string;
  editable?: boolean;
  compactMarkers?: boolean;
  focusAnnotationId?: string | null;
  onCapture?: (dataUrl: string) => void;
  onObjectClick?: () => void; // マーカー以外をクリックしたとき（オブジェクト全体選択）
}

// regions コレクションからマーカー用データを取得する関数
interface RegionDoc {
  id: string;
  creator: string;
  createdAt?: number;
  target_manifest: string;
  target_canvas: string;
  selector: {
    type: string;
    value?: [number, number, number];
    area?: number[];
    camPos?: [number, number, number];
  };
}

const getRegions = async (): Promise<RegionDoc[]> => {
  const q = query(collection(db, 'regions'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<RegionDoc, 'id'>),
  }));
};

//const ThreeCanvas = () => {
const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  annotationsVisible,
  annotationMode,
  manifestUrl,
  editable = true,
  compactMarkers = false,
  focusAnnotationId = null,
  onCapture,
  onObjectClick,
}) => {
  //const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  // イベントリスナーの存在を追跡するフラグ
  const clickListenerAdded = useRef(false);
  const dblClickListenerAdded = useRef(false);
  const contextMenuListenerAdded = useRef(false);
  const [user] = useAuthState(auth);
  const userRef = useRef(user);
  const setInfoPanel = useSetAtom(infoPanelAtom);
  const setRegionPanel = useSetAtom(regionPanelAtom);
  const selectedSpriteRef = useRef<THREE.Sprite | null>(null);
  const selectedPolygonRef = useRef<THREE.Mesh | null>(null);
  const infoPanelRef = useRef<CSS2DObject | null>(null);
  const spritesRef = useRef<THREE.Sprite[]>([]);
  const polygonsRef = useRef<THREE.Mesh[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null); // 3Dモデルへの参照
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null); // カメラへの参照
  const controlsRef = useRef<OrbitControls | null>(null); // コントロールへの参照
  const frameCountRef = useRef(0); // フレームカウンタ
  const raycasterRef = useRef(new THREE.Raycaster()); // Raycasterのインスタンスを再利用
  const [annotationInputVisible, setAnnotationInputVisible] = useState(false);
  const [annotationPosition, setAnnotationPosition] = useState<THREE.Vector3 | null>(null);
  const camPos = useRef<THREE.Vector3 | null>(null);
  const lookAt = useRef<THREE.Vector3 | null>(null);
  const polygonArea = useRef<Float32Array | null>(null); // 型を明示的に指定
  const polygonRef = useRef<THREE.Mesh | null>(null);
  const [title, setTitle] = useState('');
  const [, /*description*/ setDescription] = useState('');
  const polygonVertices = useRef<THREE.Vector3[]>([]);
  const tempPointsRef = useRef<THREE.Mesh[]>([]); // 一時的な点の表示
  const tempLinesRef = useRef<THREE.Line[]>([]); // 一時的な線の表示
  const annotationModeRef = useRef<boolean>(annotationMode);
  const compactMarkersRef = useRef<boolean>(compactMarkers);
  const onObjectClickRef = useRef<(() => void) | undefined>(onObjectClick);
  useEffect(() => { onObjectClickRef.current = onObjectClick; }, [onObjectClick]);

  const [isProgressVisible, setIsProgressVisible] = useState(true);


  const targetManifest = useRef<string | null>(null);
  const tagetCanvas = useRef<string | null>(null);

  const handleAnnotationClick = useCallback(
    (
      id: string,
      creator: string,
      title: string,
      description: string,
      media: [],
      wikidata: [],
      bibliography: []
    ) => {
      setInfoPanel({ id, creator, title, description, media, wikidata, bibliography });
    },
    [setInfoPanel]
  );

  // focusAnnotationIdが変わったときにカメラを移動
  const focusAnnotationIdRef = useRef<string | null>(null);
  const cameraAnimationRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    // nullの場合はRefをリセットして終了
    if (!focusAnnotationId) {
      focusAnnotationIdRef.current = null;
      return;
    }
    if (!cameraRef.current) return;

    // 同じIDの場合はスキップ（重複実行防止）
    if (focusAnnotationIdRef.current === focusAnnotationId) return;
    focusAnnotationIdRef.current = focusAnnotationId;

    // spritesRefからfocusAnnotationIdに一致するスプライトを探す
    const targetSprite = spritesRef.current.find(
      (sprite) => sprite.userData.id === focusAnnotationId
    );

    if (targetSprite && targetSprite.userData.camPos) {
      const targetCamPos = targetSprite.userData.camPos;

      // 既存のアニメーションがあれば停止
      if (cameraAnimationRef.current) {
        cameraAnimationRef.current.kill();
      }

      // GSAPでスムーズにカメラを移動
      cameraAnimationRef.current = gsap.to(cameraRef.current.position, {
        x: targetCamPos[0],
        y: targetCamPos[1],
        z: targetCamPos[2],
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => {
          cameraAnimationRef.current = null;
        },
      });

      // InfoPanelも更新
      handleAnnotationClick(
        targetSprite.userData.id,
        targetSprite.userData.creator,
        targetSprite.userData.title,
        targetSprite.userData.description,
        targetSprite.userData.media,
        targetSprite.userData.wikidata,
        targetSprite.userData.bibliography
      );
    }
  }, [focusAnnotationId, handleAnnotationClick]);

  // ユーザーがマウス操作を開始したらアニメーションを停止
  useEffect(() => {
    const stopAnimation = () => {
      // GSAPアニメーションを停止
      if (cameraAnimationRef.current) {
        cameraAnimationRef.current.kill();
        cameraAnimationRef.current = null;
      }
      // OrbitControlsのダンピングを即座にリセット
      if (controlsRef.current) {
        // 一時的にダンピングを無効にして即座に停止
        controlsRef.current.enableDamping = false;
        controlsRef.current.update();
        // 次のフレームでダンピングを再有効化
        requestAnimationFrame(() => {
          if (controlsRef.current) {
            controlsRef.current.enableDamping = true;
          }
        });
      }
    };

    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', stopAnimation);
      canvas.addEventListener('wheel', stopAnimation);
      canvas.addEventListener('touchstart', stopAnimation);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('mousedown', stopAnimation);
        canvas.removeEventListener('wheel', stopAnimation);
        canvas.removeEventListener('touchstart', stopAnimation);
      }
    };
  }, []);

  //もしannotationModeが変更されたら、annotationModeRefを更新
  //menifestUrlが変更されたら、manifestUrlを出力
  useEffect(() => {
    annotationModeRef.current = annotationMode;
  }, [annotationMode]);

  // compactMarkersが変更されたら、compactMarkersRefを更新
  useEffect(() => {
    compactMarkersRef.current = compactMarkers;
  }, [compactMarkers]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // canvas要素を取得
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;

    // シーン
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 既存のinfoPanelを削除
    if (infoPanelRef.current) {
      scene.remove(infoPanelRef.current);
      infoPanelRef.current = null;
    }

    // サイズ
    const sizes = {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };

    // カメラ
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
    camera.position.z = 2;
    cameraRef.current = camera; // カメラをRefに保存

    // レンダラー
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // toDataURL() のために必要
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000); // 背景色を黒に設定
    rendererRef.current = renderer;

    // CSS2DRenderer
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(sizes.width, sizes.height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);

    // manifestファイルの読み込み
    const fetchManifest = async () => {
      const response = await fetch(manifestUrl);
      const data = await response.json();
      return data;
    };

    fetchManifest().then((manifest) => {
      //getAnnotations().then(annotationData => {

      console.log('Loaded manifest:', manifest);

      // Check if the manifest structure is correct
      if (!manifest.items || !manifest.items[0] || !manifest.items[0].items ||
          !manifest.items[0].items[0] || !manifest.items[0].items[0].items ||
          !manifest.items[0].items[0].items[0] || !manifest.items[0].items[0].items[0].body) {
        console.error('Invalid manifest structure:', manifest);
        return;
      }

      const importedModel = manifest.items[0].items[0].items[0].body.id;
      console.log('Model URL:', importedModel);
      //const importedModelType = manifest.items[0].items[0].items[0].body.type;
      // Use the input manifestUrl instead of manifest.id to ensure consistency
      targetManifest.current = manifestUrl;
      tagetCanvas.current = manifest.items[0].id;

      // GLTFLoader
      const loader = new GLTFLoader();

      // Try to set up DRACO loader, but make it optional
      try {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.preload();
        loader.setDRACOLoader(dracoLoader);
        console.log('DRACO loader configured');
      } catch (error) {
        console.warn('DRACO loader failed to initialize, continuing without it:', error);
      }

      loader.load(
        //'/models/inscription_1.glb', // Replace with the path to your .glb file
        importedModel,

        (gltf) => {
          console.log('Model loaded successfully:', gltf);
          const model = gltf.scene;
          scene.add(model);

          // Store model reference for occlusion detection
          modelRef.current = model;

          // モデルのロードが完了したらprogress barを非表示にする
          setIsProgressVisible(false);
        },
        (xhr) => {
          // ロード進捗を取得
          const progress = (xhr.loaded / xhr.total) * 100;
          console.log(`Loading model: ${progress.toFixed(2)}%`);
          // 進捗バーを更新する場合
          const progressBar = document.getElementById('progress-bar');
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
          }
        },
        (error) => {
          console.error('An error happened loading the model:', error);
          setIsProgressVisible(false);
        }
      );

      // regions コレクションの変更を監視してマーカーを再生成
      const regionsQuery = query(collection(db, 'regions'));
      const unsubscribe = onSnapshot(regionsQuery, () => {
        getRegions()
          .then((regions) => {
            // 現在のマーカーを削除
            spritesRef.current.forEach((sprite) => scene.remove(sprite));
            polygonsRef.current.forEach((polygon) => scene.remove(polygon));

            const sprites: THREE.Sprite[] = [];
            const polygons: THREE.Mesh[] = [];

            regions
              .filter((region) => region.target_manifest === manifestUrl)
              .forEach((region) => {
                const sel = region.selector;

                if (sel.type === '3DSelector' && sel.value) {
                  let material: THREE.SpriteMaterial;
                  if (compactMarkersRef.current) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.beginPath();
                      ctx.arc(32, 32, 28, 0, Math.PI * 2);
                      ctx.strokeStyle = '#ef4444';
                      ctx.lineWidth = 4;
                      ctx.stroke();
                    }
                    const texture = new THREE.CanvasTexture(canvas);
                    material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, opacity: 1.0 });
                  } else {
                    const texture = new THREE.TextureLoader().load('/images/button.png');
                    texture.colorSpace = THREE.SRGBColorSpace;
                    material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, opacity: 0.7 });
                  }

                  const sprite = new THREE.Sprite(material);
                  sprite.renderOrder = 999;
                  sprite.position.set(Number(sel.value[0]), Number(sel.value[1]), Number(sel.value[2]));
                  sprite.scale.set(
                    compactMarkersRef.current ? 0.05 : 0.1,
                    compactMarkersRef.current ? 0.05 : 0.1,
                    0.2
                  );
                  sprite.userData = {
                    regionId: region.id,
                    camPos: sel.camPos,
                  };
                  scene.add(sprite);
                  sprites.push(sprite);

                } else if (sel.type === 'PolygonSelector' && sel.area) {
                  const coordinates = sel.area;
                  const vertices: THREE.Vector3[] = [];
                  for (let i = 0; i < coordinates.length; i += 3) {
                    vertices.push(new THREE.Vector3(Number(coordinates[i]), Number(coordinates[i + 1]), Number(coordinates[i + 2])));
                  }
                  const geometry = new THREE.BufferGeometry();
                  const verticesArray = new Float32Array(vertices.length * 3);
                  vertices.forEach((v, i) => { verticesArray[i * 3] = v.x; verticesArray[i * 3 + 1] = v.y; verticesArray[i * 3 + 2] = v.z; });
                  geometry.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));
                  const indices: number[] = [];
                  for (let i = 1; i < vertices.length - 1; i++) indices.push(0, i, i + 1);
                  geometry.setIndex(indices);
                  const material = new THREE.MeshBasicMaterial({ color: 'yellow', side: THREE.DoubleSide, transparent: true, opacity: 0.1 });
                  const polygon = new THREE.Mesh(geometry, material);
                  polygon.userData = {
                    regionId: region.id,
                    camPos: sel.camPos,
                  };
                  scene.add(polygon);
                  polygons.push(polygon);
                }
              });

            spritesRef.current = sprites;
            polygonsRef.current = polygons;

            // マウスクリックイベントの設定
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            const onMouseClick = (event: MouseEvent) => {
              if (event.target !== renderer.domElement) return;
              // マウスの位置を正規化
              const rect = renderer.domElement.getBoundingClientRect();
              mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

              // レイキャストを設定
              raycaster.setFromCamera(mouse, camera);

              // 交差するオブジェクトを取得
              const intersects = raycaster.intersectObjects(
                [...spritesRef.current, ...polygonsRef.current],
                true
              );

              if (intersects.length > 0) {
                // classNameが'panel'のエレメントを削除する
                const panels = document.getElementsByClassName('panel');
                for (let i = 0; i < panels.length; i++) {
                  panels[i].remove();
                }

                const intersectedObject = intersects[0].object;

                // カメラの位置をcamPosにスムーズに移動
                /*
                camera.position.set(intersectedObject.userData.camPos[0], intersectedObject.userData.camPos[1], intersectedObject.userData.camPos[2]);
                // カメラの向きをlookAtが中心になるようにスムーズに向ける
                camera.updateMatrixWorld();
                camera.lookAt(intersectedObject.position);
                camera.up.set(0, 100, 0); // カメラのアップベクトルを設定
                camera.updateProjectionMatrix();
                animate();
                
                gsap.to(camera.position, {
                  x: intersectedObject.userData.camPos[0],
                  y: intersectedObject.userData.camPos[1],
                  z: intersectedObject.userData.camPos[2],
                  duration: 1, // アニメーションの持続時間（秒）
                  onUpdate: () => {
                    camera.lookAt(intersectedObject.position);
                    camera.updateProjectionMatrix();
                    animate();
                  }
                });
                */

                // 既存の情報パネルを削除
                if (infoPanelRef.current) {
                  scene.remove(infoPanelRef.current);
                }
                selectedSpriteRef.current = null;
                selectedPolygonRef.current = null;

                // マーカーは常に regionId を持つ
                const regionId = intersectedObject.userData.regionId as string | undefined;
                if (!regionId) return;

                // regionId に紐づく全アノテーションを取得して regionPanelAtom にセット
                const q2 = query(collection(db, 'test'), where('regionId', '==', regionId));
                getDocs(q2).then((snap) => {
                  const anns = snap.docs.map((d) => {
                    const a = d.data();
                    return {
                      id: d.id,
                      creator: a.creator ?? '',
                      createdAt: a.createdAt ?? undefined,
                      title: a.data?.body?.label ?? '',
                      description: a.data?.body?.value ?? '',
                      media: a.media ?? [],
                      wikidata: a.wikidata ?? [],
                      bibliography: a.bibliography ?? [],
                      relatedAnnotations: a.relatedAnnotations ?? [],
                    };
                  });
                  setRegionPanel({ regionId, annotations: anns });
                  setInfoPanel(null);
                });

                if (intersectedObject instanceof THREE.Sprite) {
                  selectedSpriteRef.current = intersectedObject;
                } else if (intersectedObject instanceof THREE.Mesh) {
                  selectedPolygonRef.current = intersectedObject;
                }
              } else {
                // マーカー以外をクリック → オブジェクト全体選択
                onObjectClickRef.current?.();
              }
            };

            const onMouseDblClick = (event: MouseEvent) => {
              if (event.target !== renderer.domElement) return;
              // マウスの位置を正規化
              const rect = renderer.domElement.getBoundingClientRect();
              mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

              // レイキャストを設定
              raycaster.setFromCamera(mouse, camera);

              // ポリゴンモードの場合は3Dモデルのみをレイキャスト、それ以外はシーン全体
              const targetObjects = annotationModeRef.current && modelRef.current
                ? [modelRef.current]
                : scene.children;

              // クリック位置の3次元空間内の位置情報を取得
              const intersects = raycaster.intersectObjects(targetObjects, true);
              if (intersects.length > 0) {
                const intersectedPoint = intersects[0].point;

                if (annotationModeRef.current == false) {
                  const cameraDirection = new THREE.Vector3();
                  camera.getWorldDirection(cameraDirection);
                  const offset = cameraDirection.multiplyScalar(-0.01); // オフセットの距離を調整
                  // スプライトの位置をオフセット
                  const spritePosition = intersectedPoint
                    .clone()
                    .add(offset || new THREE.Vector3(0, 0, 0));

                  // オフセット後の位置をlookAtに格納
                  lookAt.current = spritePosition;

                  const sprite = new THREE.Sprite(
                    new THREE.SpriteMaterial({
                      map: new THREE.TextureLoader().load('/images/button.png'),
                    })
                  );
                  sprite.position.copy(spritePosition);
                  sprite.scale.set(0.1, 0.1, 0.1); // スプライトのサイズを調整
                  //scene.add(sprite);
                  spritesRef.current.push(sprite);

                  const screenPosition = new THREE.Vector3(
                    intersectedPoint.x,
                    intersectedPoint.y,
                    intersectedPoint.z
                  ).project(camera);
                  const x = (screenPosition.x * 0.5 + 0.5) * sizes.width;
                  const y = (screenPosition.y * -0.5 + 0.5) * sizes.height;
                  setAnnotationPosition(new THREE.Vector3(x, y, 0));
                  //　カメラの位置を取得
                  const cameraPosition = camera.position;
                  camPos.current = cameraPosition;

                  if (!userRef.current) {
                    alert('アノテーションを作成するにはログインが必要です。');
                    return;
                  }
                  setAnnotationInputVisible(true);
                } else {
                  // 頂点を追加
                  const cameraDirection = new THREE.Vector3();
                  camera.getWorldDirection(cameraDirection);
                  const offset = cameraDirection.multiplyScalar(-0.005); // オフセットの距離を調整
                  const newPoint = intersectedPoint.clone().add(offset);

                  polygonVertices.current.push(newPoint);

                  // 頂点の視覚的フィードバックを追加（小さな球体）
                  const pointGeometry = new THREE.SphereGeometry(0.02, 16, 16);
                  const pointMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    depthTest: false,  // 常に手前に表示
                    transparent: true,
                    opacity: 0.8
                  });
                  const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                  pointMesh.position.copy(newPoint);
                  pointMesh.renderOrder = 999; // 最後にレンダリング
                  scene.add(pointMesh);
                  tempPointsRef.current.push(pointMesh);

                  // 線の視覚的フィードバックを追加
                  if (polygonVertices.current.length > 1) {
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                      polygonVertices.current[polygonVertices.current.length - 2],
                      polygonVertices.current[polygonVertices.current.length - 1],
                    ]);
                    const lineMaterial = new THREE.LineBasicMaterial({
                      color: 0x00ff00,
                      linewidth: 3,
                      depthTest: false,  // 常に手前に表示
                      transparent: true,
                      opacity: 0.8
                    });
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    line.renderOrder = 999; // 最後にレンダリング
                    scene.add(line);
                    tempLinesRef.current.push(line);
                  }
                }
              }
            };

            // 右クリックでポリゴンを確定
            const onContextMenu = (event: MouseEvent) => {
              event.preventDefault(); // デフォルトのコンテキストメニューを無効化

              if (annotationModeRef.current && polygonVertices.current.length >= 3) {
                // 最低3点以上でポリゴンを作成
                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array(polygonVertices.current.length * 3);
                for (let i = 0; i < polygonVertices.current.length; i++) {
                  vertices[i * 3] = polygonVertices.current[i].x;
                  vertices[i * 3 + 1] = polygonVertices.current[i].y;
                  vertices[i * 3 + 2] = polygonVertices.current[i].z;
                }
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

                // 三角形分割: Ear clipping algorithm (簡易版)
                const indices: number[] = [];
                const n = polygonVertices.current.length;

                // 凸ポリゴンの場合の簡易三角形分割
                for (let i = 1; i < n - 1; i++) {
                  indices.push(0, i, i + 1);
                }
                geometry.setIndex(indices);

                const material = new THREE.MeshBasicMaterial({
                  color: 0xff0000,
                  side: THREE.DoubleSide,
                  transparent: true,
                  opacity: 0.2,
                });
                const polygon = new THREE.Mesh(geometry, material);
                scene.add(polygon);
                polygonRef.current = polygon;
                polygonArea.current = polygon.geometry.attributes.position
                  .array as Float32Array;
                polygonsRef.current.push(polygon);

                // 最後の頂点の位置でアノテーション入力を表示
                const lastPoint = polygonVertices.current[polygonVertices.current.length - 1];
                const screenPosition = new THREE.Vector3(
                  lastPoint.x,
                  lastPoint.y,
                  lastPoint.z
                ).project(camera);
                const x = (screenPosition.x * 0.5 + 0.5) * sizes.width;
                const y = (screenPosition.y * -0.5 + 0.5) * sizes.height;

                setAnnotationPosition(new THREE.Vector3(x, y, 0));

                // カメラの位置を取得
                const cameraPosition = camera.position;
                camPos.current = cameraPosition;

                if (!userRef.current) {
                  alert('アノテーションを作成するにはログインが必要です。');
                  return;
                }
                setAnnotationInputVisible(true);

                // 一時的な視覚的フィードバックをクリーンアップ
                tempPointsRef.current.forEach((point) => scene.remove(point));
                tempLinesRef.current.forEach((line) => scene.remove(line));
                tempPointsRef.current = [];
                tempLinesRef.current = [];

                // 頂点リストをリセット
                polygonVertices.current = [];
              }
            };

            // イベントリスナーの設定
            if (!clickListenerAdded.current) {
              window.addEventListener('click', onMouseClick);
              clickListenerAdded.current = true;
            }

            if (editable && !dblClickListenerAdded.current) {
              window.addEventListener('dblclick', onMouseDblClick);
              dblClickListenerAdded.current = true;
            }

            if (!contextMenuListenerAdded.current) {
              window.addEventListener('contextmenu', onContextMenu);
              contextMenuListenerAdded.current = true;
            }

            return () => {
              if (clickListenerAdded.current) {
                window.removeEventListener('click', onMouseClick);
                clickListenerAdded.current = false;
              }
              if (dblClickListenerAdded.current) {
                window.removeEventListener('dblclick', onMouseDblClick);
                dblClickListenerAdded.current = false;
              }
              if (contextMenuListenerAdded.current) {
                window.removeEventListener('contextmenu', onContextMenu);
                contextMenuListenerAdded.current = false;
              }
            };
          })
          .catch((error) => console.error('Error loading annotations:', error));
        //})
      }); // ここでPromiseチェーンを閉じる

      // コントロール
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; // 慣性を有効にする
      controls.dampingFactor = 0.1; // ダンピングの強さ（大きいほど早く止まる）
      controls.minDistance = 0.8; // ズームインの最小距離
      controls.maxDistance = 100; // ズームアウトの最大距離
      controls.domElement = renderer.domElement;
      controlsRef.current = controls; // コントロールへの参照を保存

      /*
    // ボックスジオメトリー
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
    const boxMaterial = new THREE.MeshLambertMaterial({
      color: '#2497f0'
    })
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial)
    scene.add(boxMesh)
    */

      // 照明
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);

      // レイキャストの頻度を減らすためのカウンタ
      //const raycastCounter = 0;

      // アニメーションループ
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update(); // コントロールの更新
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);

        // スプライトのスケールをカメラの距離に基づいて調整
        spritesRef.current.forEach((sprite) => {
          const distance = camera.position.distanceTo(sprite.position);
          const scale = distance * 0.05; // 距離に反比例してスケールを調整
          sprite.scale.set(scale, scale, scale);
        });

        // Check occlusion every 10 frames to minimize performance impact
        frameCountRef.current++;
        if (frameCountRef.current % 10 === 0) {
          spritesRef.current.forEach((sprite) => {
            if (modelRef.current) {
              // Raycast from camera to sprite
              const direction = new THREE.Vector3();
              direction.subVectors(sprite.position, camera.position).normalize();
              raycasterRef.current.set(camera.position, direction);

              const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
              const distance = camera.position.distanceTo(sprite.position);

              // If something is between camera and sprite, make it more transparent
              if (intersects.length > 0 && intersects[0].distance < distance - 0.01) {
                sprite.material.opacity = 0.0;
              } else {
                sprite.material.opacity = 0.7;
              }
            }
          });
        }

        // 情報パネルの位置を更新
        // 選択されたスプライトがある場合には、情報パネルの位置をスプライトの位置に設定, 選択されたポリゴンがある場合には、情報パネルの位置をポリゴンの位置に設定
        if (infoPanelRef.current) {
          if (selectedSpriteRef.current) {
            infoPanelRef.current.position.set(
              selectedSpriteRef.current.position.x,
              selectedSpriteRef.current.position.y + 0.02,
              selectedSpriteRef.current.position.z
            );
          } else if (selectedPolygonRef.current) {
            const mesh = selectedPolygonRef.current as THREE.Mesh;
            const positionAttribute = mesh.geometry.attributes.position;
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positionAttribute, 0); // 最初の頂点を取得
            infoPanelRef.current.position.set(vertex.x, vertex.y, vertex.z);
          }
        }
      };
      animate();

      // クリーンアップ
      return () => {
        unsubscribe();
      };

      /*
      // ブラウザのリサイズ処理
      window.addEventListener('resize', () => {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;
        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(window.devicePixelRatio);
      });
      */
    });
  }, [manifestUrl, editable, handleAnnotationClick]);

  // compactMarkersの変更時にスプライトのマテリアルとサイズを更新
  useEffect(() => {
    spritesRef.current.forEach((sprite) => {
      let material: THREE.SpriteMaterial;

      if (compactMarkers) {
        // 小さな赤い枠線のみの円（中は透明）
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.arc(32, 32, 28, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        material = new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
          transparent: true,
          opacity: 1.0,
        });
      } else {
        // 通常のボタン画像
        const texture = new THREE.TextureLoader().load('/images/button.png');
        texture.colorSpace = THREE.SRGBColorSpace;
        material = new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
          transparent: true,
          opacity: 0.7,
        });
      }

      // 古いマテリアルを破棄
      sprite.material.dispose();
      sprite.material = material;
    });
  }, [compactMarkers]);

  const handleAnnotationSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // アノテーションの保存処理をここに追加
    setAnnotationInputVisible(false);
  };

  const saveAnnotation = async () => {
    if (!user) return;
    const id = uuidv4();

    // セレクタを種別に応じて構築
    const selector = annotationModeRef.current
      ? {
          type: 'PolygonSelector',
          area: polygonArea.current ? Array.from(polygonArea.current) : [],
          camPos: [camPos.current?.x, camPos.current?.y, camPos.current?.z],
        }
      : {
          type: '3DSelector',
          value: [lookAt.current?.x, lookAt.current?.y, lookAt.current?.z],
          camPos: [camPos.current?.x, camPos.current?.y, camPos.current?.z],
        };

    // 1. 領域ノードを regions コレクションに保存
    const regionDoc = await addDoc(collection(db, 'regions'), {
      creator: user.uid,
      createdAt: Date.now(),
      target_manifest: targetManifest.current,
      target_canvas: tagetCanvas.current,
      selector,
    });

    // 2. アノテーションを regions の regionId を付与して保存
    const annotationData = {
      regionId: regionDoc.id,
      target_manifest: targetManifest.current,
      target_canvas: tagetCanvas.current,
      creator: user.uid,
      createdAt: Date.now(),
      media: [],
      wikidata: [],
      bibliography: [],
      data: {
        body: {
          label: title,
          value: {
            blocks: [{ type: 'paragraph', id, data: { text: '' } }],
            time: '',
            version: '',
          },
          type: 'TextualBody',
        },
        target: { selector },
      },
    };
    addDoc(collection(db, 'test'), annotationData);

    setAnnotationInputVisible(false);
    setTitle('');
    setDescription('');
  };

  useEffect(() => {
    spritesRef.current.forEach((sprite) => {
      sprite.visible = annotationsVisible;
    });
    polygonsRef.current.forEach((polygon) => {
      polygon.visible = annotationsVisible;
    });
    if (!annotationsVisible && infoPanelRef.current) {
      sceneRef.current?.remove(infoPanelRef.current);
      infoPanelRef.current = null;
    }
  }, [annotationsVisible]);


  const handleCapture = useCallback(() => {
    if (!rendererRef.current || !onCapture) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/jpeg', 0.85);
    onCapture(dataUrl);
  }, [onCapture]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas id="canvas" style={{ width: '100%', height: '100%', display: 'block' }} />
      {onCapture && (
        <button
          onClick={handleCapture}
          title="現在のビューをサムネイルとして保存"
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
          </svg>
          サムネイルを保存
        </button>
      )}
      {annotationInputVisible && annotationPosition && (
        <div
          className="absolute bg-[var(--card-bg)] p-3 border border-[var(--border)] rounded-lg shadow-lg z-[100]"
          style={{
            top: `${annotationPosition.y}px`,
            left: `${annotationPosition.x}px`,
          }}
        >
          <form onSubmit={handleAnnotationSubmit}>
            <label className="text-[var(--text-primary)] font-medium text-sm">
              Title:
              <br />
              <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </label>
            <br />
            <div className="flex justify-between gap-2 mt-3">
              <button
                type="button"
                onClick={() => saveAnnotation()}
                className="btn-primary"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnnotationInputVisible(false);
                  if (polygonRef.current) {
                    sceneRef.current?.remove(polygonRef.current);
                  }
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {isProgressVisible && (
        <div
          id="progress-container"
          style={{
            position: 'absolute',
            top: '50%', // 垂直方向の中央
            left: '50%', // 水平方向の中央
            transform: 'translate(-50%, -50%)', // 中央に配置
            width: '300px', // コンテナの幅
            height: '20px', // コンテナの高さ
            backgroundColor: '#ccc', // 背景色
            borderRadius: '5px', // 角を丸くする
            overflow: 'hidden', // 子要素がはみ出さないようにする
            zIndex: 1000, // 他の要素より前面に表示
          }}
        >
          <div
            id="progress-bar"
            style={{
              width: '0%', // 初期幅を0%に設定
              height: '100%', // 親要素の高さに合わせる
              backgroundColor: '#4caf50', // プログレスバーの色
              transition: 'width 0.2s ease', // 幅の変更をアニメーション化
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ThreeCanvas;
