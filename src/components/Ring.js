import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import './Ring.css';

const Ring = ({onClose}) => {
    const containerRef = useRef(null);
    const objectRef = useRef(null);
    const isTouchingRef = useRef(false);
    const previousTouchPositionRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Проверка доступности WebGL2
        const isWebGL2Available = () => {
            const canvas = document.createElement('canvas');
            return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
        };

        if (isWebGL2Available()) {
            // Настройка сцены, камеры и рендерера
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

            // Установка размера рендерера
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            containerRef.current.appendChild(renderer.domElement);

            // Освещение
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0x2E3E67, 10);
            directionalLight.position.set(1, 3, 3);
            directionalLight.castShadow = false;
            directionalLight.receiveShadow = true;
            directionalLight.shadow.mapSize.width = 48;
            directionalLight.shadow.mapSize.height = 48;
            directionalLight.shadow.camera.near = 1;
            directionalLight.shadow.camera.far = 50;
            scene.add(directionalLight);

            const pointLight = new THREE.PointLight(0x994141, 5, 1);
            pointLight.position.set(0, 1, 0);
            pointLight.castShadow = true;
            scene.add(pointLight);

            // Плоскость для визуализации теней
            const planeGeometry = new THREE.PlaneGeometry(5, 5);
            const planeMaterial = new THREE.ShadowMaterial({ color: 'white', opacity: 0.3 });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.rotation.x = -Math.PI / 2;
            plane.position.y = -1;
            plane.receiveShadow = true;
            scene.add(plane);

            // Загрузка FBX модели
            const loader = new FBXLoader();
            loader.load('/ring.fbx', (loadedObject) => {
                objectRef.current = loadedObject;
                objectRef.current.scale.set(0.058, 0.058, 0.058);
                objectRef.current.position.set(0, 1, 0);
                objectRef.current.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: 'white',
                            metalness: 1,
                            roughness: 0.6,
                            emissive: 0x111111,
                            emissiveIntensity: 0
                        });

                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                scene.add(objectRef.current);
            }, undefined, (error) => {
                console.error(error);
            });

            camera.position.z = 5;

            // Управление касанием для мобильных устройств
            const handleTouchStart = (event) => {
                isTouchingRef.current = true;
                previousTouchPositionRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            };

            const handleTouchMove = (event) => {
                if (!isTouchingRef.current || !objectRef.current) return;

                event.preventDefault(); // Предотвращаем прокрутку

                const deltaMove = {
                    x: event.touches[0].clientX - previousTouchPositionRef.current.x,
                    y: event.touches[0].clientY - previousTouchPositionRef.current.y
                };

                // Вращение модели на основе перемещения касания
                objectRef.current.rotation.y += deltaMove.x * 0.01;
                objectRef.current.rotation.x += deltaMove.y * 0.01;

                previousTouchPositionRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            };

            const handleTouchEnd = () => {
                isTouchingRef.current = false;
            };

            window.addEventListener('touchstart', handleTouchStart, { passive: false });
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);

            // Анимация
            const animate = () => {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            };
            animate();

            // Обработка изменения размера окна
            const handleResize = () => {
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            };

            window.addEventListener('resize', handleResize);

            // Очистка при размонтировании компонента
            return () => {
                window.removeEventListener('touchstart', handleTouchStart);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
                window.removeEventListener('resize', handleResize);
                if(renderer){
                  renderer.dispose();
                }
                
                if (containerRef.current && renderer.domElement) {
                  containerRef.current.removeChild(renderer.domElement);
                }
            };
        } else {
            const warning = document.createElement('div');
            warning.textContent = "WebGL 2 не поддерживается вашим браузером или устройством.";
            containerRef.current.appendChild(warning);
        }
    }, []);

    return (
        <div className="ring-overlay">
            <div className="ring-content">
                <button className="close-button" onClick={onClose}>
                    ✖
                </button>
                <div ref={containerRef} className="ring-canvas-container" />
            </div>
        </div>
    );
};

export default Ring;

