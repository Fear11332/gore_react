//i
import React, { useRef, useEffect, useState } from 'react';
import './MapComponent.css';
import Ring from './Ring';

const MapComponent = () => {
    const canvasRef = useRef(null);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [scale, setScale] = useState(1);
    const [img, setImg] = useState(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [canvasSize,setCanvasSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const markerRef = useRef(null);
    const [isZoomingIn, setIsZoomingIn] = useState(true);
    const [showRing, setShowRing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [isLocked, setIsLocked] = useState(false); // Блокировка взаимодействия

    const MIN_SCALE = 1;
    const MAX_SCALE = 2;
    const ANIMATION_DURATION = 500;

    const loadImage = () => {
        const image = new Image();
        image.src = '/map.png';
        image.onload = () => {
            setImg(image);
            setImgLoaded(true);
            updateCanvasAndScale(); // Обновляем канвас только после загрузки изображения
        };
    };

    const updateCanvasAndScale = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            // Убедитесь, что размеры канваса обновлены
            canvas.width = canvasSize.width;
            canvas.height = canvasSize.height;

            if (imgLoaded) {
                const fitImageToScreen = () => {
                    const widthRatio = canvas.width / img.width;
                    const heightRatio = canvas.height / img.height;
                    const minRatio = Math.min(widthRatio, heightRatio);
                    
                    setScale(minRatio);
                    setOffsetX(0);
                    setOffsetY(0);
                };

                fitImageToScreen();
                positionMarker();
            }
        }
    };

    const animateZoom = (startScale, endScale, startX, startY, duration) => {
        let startTime = null;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1); // Прогресс от 0 до 1
            const currentScale = startScale + progress * (endScale - startScale);

            const imageMouseX = (startX - offsetX) / scale;
            const imageMouseY = (startY - offsetY) / scale;

            const newImageMouseX = imageMouseX * currentScale;
            const newImageMouseY = imageMouseY * currentScale;

            const newOffsetX = startX - newImageMouseX;
            const newOffsetY = startY - newImageMouseY;

            setScale(currentScale);
            setOffsetX(clampOffset(newOffsetX, 'x', currentScale));
            setOffsetY(clampOffset(newOffsetY, 'y', currentScale));

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                setIsZoomingIn(!isZoomingIn);
            }
        };

        requestAnimationFrame(step);
    };

    const handleCanvasTap = (e) => {
        if (isLocked) return; // Если заблокировано, игнорировать нажатия
        const rect = canvasRef.current.getBoundingClientRect();
        const midX = e.clientX - rect.left;
        const midY = e.clientY - rect.top;

        const targetScale = isZoomingIn ? MAX_SCALE : MIN_SCALE;

        animateZoom(scale, targetScale, midX, midY, ANIMATION_DURATION);
        positionMarker();
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 1 && !isLocked) { // Проверка на блокировку
            setIsDragging(true);
            setStartX(e.touches[0].clientX);
            setStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (isDragging && e.touches.length === 1) {
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;

            setOffsetX((prev) => clampOffset(prev + dx, 'x'));
            setOffsetY((prev) => clampOffset(prev + dy, 'y'));

            setStartX(e.touches[0].clientX);
            setStartY(e.touches[0].clientY);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        positionMarker();
    };

    const clampOffset = (value, axis, currentScale = scale) => {
        const mapWidth = img.width * currentScale;
        const mapHeight = img.height * currentScale;
        const { width, height } = canvasSize;

        if (axis === 'x') {
            if (value > 0) return 0;
            if (value < -(mapWidth - width)) return -(mapWidth - width);
        } else if (axis === 'y') {
            if (value > 0) return 0;
            if (value < -(mapHeight - height)) return -(mapHeight - height);
        }

        return value;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (imgLoaded) {
            context.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
        }

        positionMarker();
    }, [offsetX, offsetY, img, imgLoaded, scale]);

    const positionMarker = () => {
        const markerX = 100; // Координаты маркера
        const markerY = 200;

        const canvasMarkerX = markerX * scale + offsetX; 
        const canvasMarkerY = markerY * scale + offsetY; 

        if (markerRef.current) {
            markerRef.current.style.left = `${canvasMarkerX}px`;
            markerRef.current.style.top = `${canvasMarkerY}px`;
        }

        // Если зум меньше 2, маркер скрывается
        if (scale < 2) {
            markerRef.current.style.display = 'none';
        } else {
            markerRef.current.style.display = 'block';
        }
    };

    useEffect(() => {
        const checkOrientation = () => {
            if (window.innerWidth > window.innerHeight) {
                setIsLocked(true); // Заблокировать, если в горизонтальном режиме
                setIsDragging(false);
            } else {
                loadImage();
                setIsLocked(false); // Разблокировать, если в вертикальном режиме
                setIsDragging(true); // Сброс состояния перетаскивания
            }
        };

        // Изначальная проверка ориентации
        checkOrientation();

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation); // Обработчик на изменение ориентации

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging, startX, startY, offsetX, offsetY, scale]);

    const closeRing = () => {
        setShowRing(false);
        document.body.style.overflow = 'auto'; 
    };

    const handleDoubleClickMarker = () => {
        setShowRing(true);
        document.body.style.overflow = 'hidden'; 
    };

    return (
        <div className="map-container">
            {isLocked && (
                <div className="locked-overlay">
                    <div className="rotate-animation">
                        <img src="/rotation.jpeg" alt="Rotate your device" />
                    </div>
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="map-canvas"
                onClick={handleCanvasTap}
            />
            <div ref={markerRef} className="marker" onClick={handleDoubleClickMarker} />
            {showRing && <Ring onClose={closeRing} />}
        </div>
    );
};

export default MapComponent;















































