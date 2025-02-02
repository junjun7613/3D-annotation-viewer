'use client';

import type { NextPage } from 'next';
import { useEffect } from 'react';
import * as THREE from 'three';

const Home: NextPage = () => {
  let canvas: HTMLElement;
  useEffect(() => {
    if (canvas) return;
    // canvasを取得
    canvas = document.getElementById('canvas')!;

    // シーン
    const scene = new THREE.Scene();

    // サイズ
    const sizes = {
      width: 800,
      height: 600,
    };

    // カメラ
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);

    // レンダラー
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas || undefined,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // ボックスジオメトリー
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshLambertMaterial({
      color: '#2497f0',
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.z = -5;
    box.rotation.set(10, 10, 10);
    scene.add(box);

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.2);
    pointLight.position.set(1, 2, 3);
    scene.add(pointLight);

    // アニメーション
    const clock = new THREE.Clock();
    const tick = () => {
      const elapsedTime = clock.getElapsedTime();
      box.rotation.x = elapsedTime;
      box.rotation.y = elapsedTime;
      window.requestAnimationFrame(tick);
      renderer.render(scene, camera);
    };
    tick();

    // ブラウザのリサイズ処理
    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    });
  }, []);
  return (
    <div style={{ width: '800px', height: '600px', border: '1px solid black' }}>
      <canvas id="canvas" style={{ border: '2px solid red' }}></canvas>
    </div>
  );
};

export default Home;
