"use client";

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { GLTFLoader } from 'three-stdlib'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'

interface ThreeCanvasProps {
  annotationsVisible: boolean;
}

//const ThreeCanvas = () => {
const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ annotationsVisible }) => {
  const selectedSpriteRef = useRef<THREE.Sprite | null>(null)
  const infoPanelRef = useRef<CSS2DObject | null>(null)
  const spritesRef = useRef<THREE.Sprite[]>([])
  const sceneRef = useRef<THREE.Scene | null>(null)
  const [annotationInputVisible, setAnnotationInputVisible] = useState(false);
  const [annotationPosition, setAnnotationPosition] = useState<THREE.Vector3 | null>(null);
  const comPos = useRef<THREE.Vector3 | null>(null);
  const lookAt = useRef<THREE.Vector3 | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let canvas = document.getElementById('canvas') as HTMLCanvasElement

    // シーン
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // サイズ
    const sizes = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    }

    // カメラ
    const camera = new THREE.PerspectiveCamera(
      75,
      sizes.width / sizes.height,
      0.1,
      1000
    )
    camera.position.z = 2

    // レンダラー
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x000000) // 背景色を黒に設定

    // CSS2DRenderer
    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(sizes.width, sizes.height)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0px'
    labelRenderer.domElement.style.pointerEvents = 'none'
    document.body.appendChild(labelRenderer.domElement)

    // GLTFLoader
    const loader = new GLTFLoader()
    loader.load(
      '/models/inscription_1.glb', // Replace with the path to your .glb file
      
      (gltf) => {
        const model = gltf.scene
        scene.add(model)
      },
      undefined,
      (error) => {
        console.error('An error happened', error)
      }
    )

    // アノテーションの読み込み
    fetch('/data/annotations/annotations.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.json()
      })
      .then(data => {
        if (!data.annotations) {
          throw new Error('Invalid data format')
        }
        const sprites: THREE.Sprite[] = []
        for (let i = 0; i < data.annotations.length; i++) {
          const annotation = data.annotations[i];
          const description = annotation.description ? annotation.description : ''
          
          const texture = new THREE.TextureLoader().load('/images/button.png');
          texture.colorSpace = THREE.SRGBColorSpace;

          // マテリアルを作成する
          const material = new THREE.SpriteMaterial({
            map: texture,
          });

          const sprite = new THREE.Sprite(material);
          sprite.position.set(annotation.lookAt.x, annotation.lookAt.y, annotation.lookAt.z);

          // スプライトのサイズを調整する
          sprite.scale.set(0.1, 0.1, 0.2); // ここでサイズを調整します。必要に応じて値を変更してください。
          sprite.userData = {
            title: annotation.title,
            description: annotation.description
          }

          scene.add(sprite);
          sprites.push(sprite)
        }
        spritesRef.current = sprites

        // マウスクリックイベントの設定
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()

        const onMouseClick = (event: MouseEvent) => {
          // マウスの位置を正規化
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          // レイキャストを設定
          raycaster.setFromCamera(mouse, camera)

          // 交差するオブジェクトを取得
          const intersects = raycaster.intersectObjects(sprites)

          if (intersects.length > 0) {
            
            // classNameが'panel'のエレメントを削除する
            const panels = document.getElementsByClassName('panel')
            for (let i = 0; i < panels.length; i++) {
              panels[i].remove()
            }

            const intersectedSprite = intersects[0].object as THREE.Sprite
            console.log('Sprite clicked:', intersectedSprite)
            // ここでクリックされたスプライトに対するアクションを実行します
            // HTMLパネルを作成して情報を表示
            const title = intersectedSprite.userData.title
            const description = intersectedSprite.userData.description

            // 既存の情報パネルを削除
            if (infoPanelRef.current) {
              scene.remove(infoPanelRef.current)
            }

            const div = document.createElement('div')
            div.className = 'panel'
            div.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
            div.style.color = 'white'
            div.style.padding = '10px'
            div.style.pointerEvents = 'auto' // クリックを有効にする
            div.innerHTML = `<h3>${title}</h3>${description}`

            const infoPanel = new CSS2DObject(div)
            infoPanel.position.set(intersectedSprite.position.x, intersectedSprite.position.y, intersectedSprite.position.z - 0.45)
            scene.add(infoPanel)
            infoPanelRef.current = infoPanel
            selectedSpriteRef.current = intersectedSprite
            
          }
        };

        const onMouseDblClick = (event: MouseEvent) => {
          // マウスの位置を正規化
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          // レイキャストを設定
          raycaster.setFromCamera(mouse, camera);

          // クリック位置の3次元空間内の位置情報を取得
          const intersects = raycaster.intersectObjects(scene.children, true);
          if (intersects.length > 0) {
            const intersectedPoint = intersects[0].point;
            lookAt.current = intersectedPoint;
            console.log('Clicked position in 3D space:', intersectedPoint);
            const screenPosition = new THREE.Vector3(intersectedPoint.x, intersectedPoint.y, intersectedPoint.z).project(camera);
            const x = (screenPosition.x * 0.5 + 0.5) * sizes.width;
            const y = (screenPosition.y * -0.5 + 0.5) * sizes.height;
            setAnnotationPosition({ x, y });
            //　カメラの位置を取得
            const cameraPosition = camera.position;
            comPos.current = cameraPosition;
            console.log('Camera position:', cameraPosition);
            setAnnotationInputVisible(true);
          }
        };

        window.addEventListener('click', onMouseClick)
        window.addEventListener('dblclick', onMouseDblClick);

        return () => {
          window.removeEventListener('click', onMouseClick)
          window.removeEventListener('dblclick', onMouseDblClick);
        }
    
  })
      .catch(error => console.error('Error loading annotations:', error))

    // コントロール
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true // 慣性を有効にする
    controls.minDistance = 1 // ズームインの最小距離
    controls.maxDistance = 5 // ズームアウトの最大距離

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // アニメーションループ
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update() // コントロールの更新
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)

      // 情報パネルの位置を更新
      if (infoPanelRef.current && selectedSpriteRef.current) {
        infoPanelRef.current.position.set(
          selectedSpriteRef.current.position.x,
          selectedSpriteRef.current.position.y,
          selectedSpriteRef.current.position.z - 0.45
        )
      }
    }
    animate()

    // ズーム機能
    const handleWheel = (event: WheelEvent) => {
      camera.position.z += event.deltaY * 0.01
    }
    window.addEventListener('wheel', handleWheel)

    // クリーンアップ
    return () => {
      window.removeEventListener('wheel', handleWheel)
    }

    // ブラウザのリサイズ処理
    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth
      sizes.height = window.innerHeight
      camera.aspect = sizes.width / sizes.height
      camera.updateProjectionMatrix()
      renderer.setSize(sizes.width, sizes.height)
      renderer.setPixelRatio(window.devicePixelRatio)
    })
  }, []);

  const handleAnnotationSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // アノテーションの保存処理をここに追加
    setAnnotationInputVisible(false);
  };

  const saveAnnotation = () => {
    console.log("annotation saved!")
    console.log(lookAt.current)
    console.log(comPos.current)
    console.log(title)
    console.log(description)
    setAnnotationInputVisible(false);

    //annotations.jsonにアノテーションを追加
    const annotation = {
      title: title,
      description: description,
      lookAt: {
        x: lookAt.current?.x,
        y: lookAt.current?.y,
        z: lookAt.current?.z
      },
      comPos: {
        x: comPos.current?.x,
        y: comPos.current?.y,
        z: comPos.current?.z
      }
    }
    console.log(annotation)
    //public/data/annotations.jsonのannotationsのvalueのリストに追加
    fetch('/data/annotations/annotations.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.json()
      })
      .then(data => {
        if (!data.annotations) {
          throw new Error('Invalid data format')
        }
        data.annotations.push(annotation)
        return data
      })
      .then(data => {
        fetch('/data/annotations/annotations.json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
      })
      .catch(error => console.error('Error saving annotation:', error))

    //titleの値を初期化
    setTitle('');
    setDescription('');
  }

  useEffect(() => {
    spritesRef.current.forEach(sprite => {
      sprite.visible = annotationsVisible
    })
    if (!annotationsVisible && infoPanelRef.current) {
      sceneRef.current?.remove(infoPanelRef.current)
      infoPanelRef.current = null
    }
  }, [annotationsVisible])

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
            zIndex: 100
          }}
        >
          <form onSubmit={handleAnnotationSubmit}>
            <label>
              Title:
              <input type="text" name="title" value={title} onChange={(e) => setTitle(e.target.value)}  required />
            </label>
            <br />
            <label>
              Description:
              <textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)}  required />
            </label>
            <br />
            <button type="button" onClick={() => saveAnnotation()}>Save</button>
            <button type="button" onClick={() => setAnnotationInputVisible(false)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ThreeCanvas