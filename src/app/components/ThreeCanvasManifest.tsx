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
import { addDoc, collection, getDocs, query, onSnapshot } from 'firebase/firestore';
import { useSetAtom } from 'jotai';
import { infoPanelAtom } from '@/app/atoms/infoPanelAtom';

// uuidをインポート
import { v4 as uuidv4 } from 'uuid';

//firebaseのデータを格納するための型
interface Annotation {
  id: string;
  creator: string;
  title: string;
  description: string;
  media: [];
  wikidata: [];
  bibliography: [];
  position: {
    x: number;
    y: number;
    z: number;
  };
  target_manifest?: string;
  data: {
    body: {
      value: string;
      label: string;
    };
    target: {
      selector: {
        type: string;
        value: [number, number, number]; // valueプロパティを追加
        area: [number, number, number]; // areaプロパティを追加
        camPos: [number, number, number]; // camPosプロパティを追加
      };
    };
  };
}

interface ThreeCanvasProps {
  annotationsVisible: boolean;
  annotationMode: boolean;
  manifestUrl: string;
  editable?: boolean;
}

//firebaseからデータを取得する関数
const getAnnotations = async () => {
  const annotations: Annotation[] = [];
  //const q = query(collection(db, 'annotations'));
  const q = query(collection(db, 'test'));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    const data = doc.data() as Annotation;

    const annotationWithId = {
      ...data,
      id: doc.id,
      creator: data.creator,
      media: data.media || [],
      wikidata: data.wikidata || [],
      bibliography: data.bibliography || [],
    };
    annotations.push(annotationWithId);
  });

  return annotations;
};

//const ThreeCanvas = () => {
const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  annotationsVisible,
  annotationMode,
  manifestUrl,
  editable = true,
}) => {
  //const canvasRef = useRef<HTMLDivElement>(null);
  //const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  // イベントリスナーの存在を追跡するフラグ
  const clickListenerAdded = useRef(false);
  const dblClickListenerAdded = useRef(false);
  const contextMenuListenerAdded = useRef(false);
  const [user] = useAuthState(auth);
  const setInfoPanel = useSetAtom(infoPanelAtom);
  const selectedSpriteRef = useRef<THREE.Sprite | null>(null);
  const selectedPolygonRef = useRef<THREE.Mesh | null>(null);
  const infoPanelRef = useRef<CSS2DObject | null>(null);
  const spritesRef = useRef<THREE.Sprite[]>([]);
  const polygonsRef = useRef<THREE.Mesh[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null); // 3Dモデルへの参照
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

  const [isProgressVisible, setIsProgressVisible] = useState(true);

  const [, /*infoPanelContent*/ setInfoPanelContent] = useState({
    title: '',
    description: '',
    id: '',
  });

  const targetManifest = useRef<string | null>(null);
  const tagetCanvas = useRef<string | null>(null);

  const handleInfoPanelContentChange = (content: {
    id: string;
    creator: string;
    title: string;
    description: string;
    media: [];
    wikidata: [];
    bibliography: [];
  }) => {
    setInfoPanelContent(content);
  };

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

  //もしannotationModeが変更されたら、annotationModeRefを更新
  //menifestUrlが変更されたら、manifestUrlを出力
  useEffect(() => {
    annotationModeRef.current = annotationMode;
  }, [annotationMode]);

  useEffect(() => {
    //const q = query(collection(db, 'annotations'));
    const q = query(collection(db, 'test'));

    // ここでシーンの再描画や他の処理を行う

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

    // レンダラー
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000); // 背景色を黒に設定

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

      const importedModel = manifest.items[0].items[0].items[0].body.id;
      //const importedModelType = manifest.items[0].items[0].items[0].body.type;
      // Use the input manifestUrl instead of manifest.id to ensure consistency
      targetManifest.current = manifestUrl;
      tagetCanvas.current = manifest.items[0].id;

      // GLTFLoader
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
      loader.setDRACOLoader(dracoLoader);
      loader.load(
        //'/models/inscription_1.glb', // Replace with the path to your .glb file
        importedModel,

        (gltf) => {
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
          // 進捗バーを更新する場合
          const progressBar = document.getElementById('progress-bar');
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
          }
        },
        (error) => {
          console.error('An error happened', error);
        }
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const annotations: Annotation[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Annotation;
          const annotationWithId = {
            ...data,
            id: doc.id,
            creator: data.creator,
            media: data.media || [],
            bibliography: data.bibliography || [],
          };
          annotations.push(annotationWithId);
        });
        // アノテーションの更新を反映
        // 必要に応じて、シーンの再描画や他の処理を行う
        // アノテーションの読み込み
        getAnnotations()
          .then((data) => {
            // manifestにdataを格納

            // 現在のannotationsを削除
            spritesRef.current.forEach((sprite) => {
              scene.remove(sprite);
            });

            const sprites: THREE.Sprite[] = [];
            const polygons = [];
            const objects = []; // sprites + polygons
            //for (let i = 0; i < data.items[0].items[1].items.length; i++) {
            for (let i = 0; i < data.length; i++) {
              //const annotation = data.items[0].items[1].items[i];
              const annotation = data[i];

              // Compare with manifestUrl instead of manifest.id
              if (annotation.target_manifest === manifestUrl) {
                const description = annotation.data.body.value ? annotation.data.body.value : '';

                // 3DSelectorの場合の処理
                if (annotation.data.target.selector.type == '3DSelector') {
                  // spriteの作成
                  const texture = new THREE.TextureLoader().load('/images/button.png');
                  texture.colorSpace = THREE.SRGBColorSpace;

                  // マテリアルを作成する
                  const material = new THREE.SpriteMaterial({
                    map: texture,
                    depthTest: false, // スプライトを常に前面に表示
                    transparent: true, // スプライトを半透明にする
                    opacity: 0.7,
                  });

                  const sprite = new THREE.Sprite(material);
                  sprite.renderOrder = 999; // スプライトのレンダー順序を設定

                  const coordinates = annotation.data.target.selector.value;

                  //coordinatesの各要素を数値化して、spriteの位置を設定
                  sprite.position.set(
                    Number(coordinates[0]),
                    Number(coordinates[1]),
                    Number(coordinates[2])
                  );

                  // スプライトのサイズを調整する
                  sprite.scale.set(0.1, 0.1, 0.2); // ここでサイズを調整します。必要に応じて値を変更してください。
                  sprite.userData = {
                    id: annotation.id,
                    creator: annotation.creator,
                    title: annotation.data.body.label,
                    description: description,
                    media: annotation.media,
                    wikidata: annotation.wikidata,
                    bibliography: annotation.bibliography,
                    camPos: annotation.data.target.selector.camPos,
                  };

                  /*
                  // レイキャスターを使用してスプライトの位置をチェック
                  const raycaster = new THREE.Raycaster();
                  raycaster.setFromCamera(new THREE.Vector2(), camera);
                  const intersects = raycaster.intersectObject(sprite, false);

                  if (intersects.length < 1) {
                    sprite.visible = true; // オブジェクトの前面にある場合は表示する
                  } else {
                    sprite.visible = false; // オブジェクトの裏側にある場合は非表示にする
                  }
                  */

                  scene.add(sprite);
                  sprites.push(sprite);
                  objects.push(sprite);
                } else if (annotation.data.target.selector.type == 'PolygonSelector') {
                  // polygonの作成
                  const coordinates = annotation.data.target.selector.area;

                  const vertices = [];
                  for (let i = 0; i < coordinates.length; i += 3) {
                    vertices.push(
                      new THREE.Vector3(
                        Number(coordinates[i]),
                        Number(coordinates[i + 1]),
                        Number(coordinates[i + 2])
                      )
                    );
                  }

                  const geometry = new THREE.BufferGeometry();
                  const verticesArray = new Float32Array(vertices.length * 3);
                  for (let i = 0; i < vertices.length; i++) {
                    verticesArray[i * 3] = vertices[i].x;
                    verticesArray[i * 3 + 1] = vertices[i].y;
                    verticesArray[i * 3 + 2] = vertices[i].z;
                  }
                  geometry.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));

                  // 三角形分割: 任意の点数に対応
                  const indices: number[] = [];
                  const n = vertices.length;
                  for (let i = 1; i < n - 1; i++) {
                    indices.push(0, i, i + 1);
                  }
                  geometry.setIndex(indices);

                  const material = new THREE.MeshBasicMaterial({
                    color: 'yellow',
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.1,
                  });
                  const polygon = new THREE.Mesh(geometry, material);
                  polygon.userData = {
                    id: annotation.id,
                    creator: annotation.creator,
                    title: annotation.data.body.label,
                    description: description,
                    media: annotation.media,
                    wikidata: annotation.wikidata,
                    bibliography: annotation.bibliography,
                    camPos: annotation.data.target.selector.camPos,
                  };
                  scene.add(polygon);
                  polygons.push(polygon);
                  objects.push(polygon);
                }
              }
            }
            spritesRef.current = sprites;
            polygonsRef.current = polygons;

            // マウスクリックイベントの設定
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            const onMouseClick = (event: MouseEvent) => {
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

                //既存のselectedSpriteRefを削除
                selectedSpriteRef.current = null;
                selectedPolygonRef.current = null;

                let id = '';
                let creator = '';
                let title = '';
                let description = '';
                let media = [];
                let wikidata = [];
                let bibliography = [];

                if (intersectedObject instanceof THREE.Sprite) {
                  // スプライトの場合の処理
                  id = intersectedObject.userData.id;
                  creator = intersectedObject.userData.creator;
                  title = intersectedObject.userData.title;
                  description = intersectedObject.userData.description;
                  media = intersectedObject.userData.media;
                  wikidata = intersectedObject.userData.wikidata;
                  bibliography = intersectedObject.userData.bibliography;
                } else if (intersectedObject instanceof THREE.Mesh) {
                  // ポリゴンの場合の処理
                  id = intersectedObject.userData.id;
                  creator = intersectedObject.userData.creator;
                  title = intersectedObject.userData.title;
                  description = intersectedObject.userData.description;
                  media = intersectedObject.userData.media;
                  wikidata = intersectedObject.userData.wikidata;
                  bibliography = intersectedObject.userData.bibliography;
                }

                handleInfoPanelContentChange({
                  id,
                  creator,
                  title,
                  description,
                  media,
                  wikidata,
                  bibliography,
                });
                handleAnnotationClick(
                  id,
                  creator,
                  title,
                  description,
                  media,
                  wikidata,
                  bibliography
                );

                //if (title && description) {
                if (title) {
                  const div = document.createElement('div');
                  div.className = 'panel';
                  div.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                  div.style.color = 'white';
                  div.style.padding = '10px';
                  div.style.pointerEvents = 'auto'; // クリックを有効にする
                  div.innerHTML = `<h3 style={{fontWeight: 'bold'}}>${title}</h3>`;

                  const infoPanel = new CSS2DObject(div);

                  if (intersectedObject instanceof THREE.Sprite) {
                    infoPanel.position.set(
                      intersectedObject.position.x,
                      intersectedObject.position.y + 0.02,
                      intersectedObject.position.z
                    );
                  } else if (intersectedObject instanceof THREE.Mesh) {
                    const mesh = intersectedObject as THREE.Mesh;
                    const positionAttribute = mesh.geometry.attributes.position;
                    const vertex = new THREE.Vector3();
                    vertex.fromBufferAttribute(positionAttribute, 0); // 最初の頂点を取得
                    infoPanel.position.set(vertex.x, vertex.y, vertex.z);
                  }

                  scene.add(infoPanel);
                  infoPanelRef.current = infoPanel;

                  //20秒で情報パネルを削除
                  setTimeout(() => {
                    scene.remove(infoPanel);
                  }, 5000);

                  // spriteの場合にはselectedSpriteRefに選択されたスプライトを格納
                  if (intersectedObject instanceof THREE.Sprite) {
                    selectedSpriteRef.current = intersectedObject;
                  } else if (intersectedObject instanceof THREE.Mesh) {
                    selectedPolygonRef.current = intersectedObject;
                  }
                }
              }
            };

            const onMouseDblClick = (event: MouseEvent) => {
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
      controls.minDistance = 0.8; // ズームインの最小距離
      controls.maxDistance = 10; // ズームアウトの最大距離
      controls.domElement = renderer.domElement;

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

  const handleAnnotationSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // アノテーションの保存処理をここに追加
    setAnnotationInputVisible(false);
  };

  const saveAnnotation = () => {
    // uuidを生成
    const id = uuidv4();
    if (annotationModeRef.current) {
      //alert("Please create a polygon annotation!");

      // Float32Arrayを通常の配列に変換
      const polygonArray = polygonArea.current ? Array.from(polygonArea.current) : [];

      //firebaseにデータを格納
      const data = {
        target_manifest: targetManifest.current,
        target_canvas: tagetCanvas.current,
        creator: user?.uid,
        media: [],
        wikidata: [],
        bibliography: [],
        data: {
          body: {
            label: title,
            //value: description,
            //value: '',
            value: {
              blocks: [
                {
                  type: 'paragraph',
                  id: id,
                  data: {
                    text: '',
                  },
                },
              ],
              time: '',
              version: '',
            },
            type: 'TextualBody',
          },
          target: {
            selector: {
              type: 'PolygonSelector',
              area: polygonArray,
              camPos: [camPos.current?.x, camPos.current?.y, camPos.current?.z],
            },
          },
        },
      };
      //addDoc(collection(db, 'annotations'), data);
      addDoc(collection(db, 'test'), data);

      setAnnotationInputVisible(false);
      setTitle('');
      return;
    } else {
      //firebaseにデータを格納
      const data = {
        target_manifest: targetManifest.current,
        target_canvas: tagetCanvas.current,
        creator: user?.uid,
        media: [],
        wikidata: [],
        bibliography: [],
        data: {
          body: {
            label: title,
            //value: description,
            //value: '',
            value: {
              blocks: [
                {
                  type: 'paragraph',
                  id: id,
                  data: {
                    text: '',
                  },
                },
              ],
              time: '',
              version: '',
            },
            type: 'TextualBody',
          },
          target: {
            selector: {
              type: '3DSelector',
              value: [lookAt.current?.x, lookAt.current?.y, lookAt.current?.z],
              camPos: [camPos.current?.x, camPos.current?.y, camPos.current?.z],
            },
          },
        },
      };
      //addDoc(collection(db, 'annotations'), data);
      addDoc(collection(db, 'test'), data);

      setAnnotationInputVisible(false);
      setTitle('');
    }

    //titleの値を初期化
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

  // Firebaseのリアルタイム更新を監視
  useEffect(() => {
    //const q = query(collection(db, 'annotations'));
    const q = query(collection(db, 'test'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const annotations: Annotation[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Annotation;
        const annotationWithId = {
          ...data,
          id: doc.id,
          creator: data.creator,
          media: data.media || [],
          bibliography: data.bibliography || [],
          wikidata: data.wikidata || [],
        };
        annotations.push(annotationWithId);
      });
      // アノテーションの更新を反映
      // 必要に応じて、シーンの再描画や他の処理を行う

      // ここでシーンの再描画や他の処理を行う
    });

    // クリーンアップ関数
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas id="canvas" style={{ width: '100%', height: '100%', display: 'block' }} />
      {annotationInputVisible && annotationPosition && (
        <div
          style={{
            position: 'absolute',
            top: `${annotationPosition.y}px`,
            left: `${annotationPosition.x}px`,
            backgroundColor: 'white',
            padding: '10px',
            border: '1px solid black',
            zIndex: 100,
          }}
        >
          <form onSubmit={handleAnnotationSubmit}>
            <label>
              Title:
              <br />
              <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              />
            </label>
            <br />
            {/*
            <label>
              Description:
              <br />
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
            </label>
            */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                onClick={() => saveAnnotation()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#000080',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginTop: '10px',
                }}
              >
                Save
              </button>
              <button
                type="button"
                // setAnnotationInputVisibleをfalseにし、polygonRefをsceneから削除
                onClick={() => {
                  setAnnotationInputVisible(false);
                  if (polygonRef.current) {
                    sceneRef.current?.remove(polygonRef.current);
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ccc',
                  color: 'black',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginTop: '10px',
                }}
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
