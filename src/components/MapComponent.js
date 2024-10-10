import React, { useRef, useEffect, useState } from 'react';
import './MapComponent.css';
import Ring from './Ring';

const MapComponent = () => {
    const canvasRef = useRef(null);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [scale, setScale] = useState(1); // Начальный минимальный масштаб
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [img, setImg] = useState(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [canvasSize, setCanvasSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const [showRing, setShowRing] = useState(false);

    const markerRef = useRef(null); // Ссылка на маркер

    const MIN_SCALE = 1; // Минимальный зум (начальный)
    const MAX_SCALE = 2; // Максимальный зум
    const ZOOM_STEP = 1; // Шаг зума

    useEffect(() => {
        const image = new Image();
        image.src = '/map.png'; // Путь к изображению
        image.onload = () => {
            setImg(image);
            setImgLoaded(true);
        };
    }, []);

    // Функция для обновления размера канваса и масштабирования изображения
    const updateCanvasAndScale = () => {
        const canvas = canvasRef.current;

        // Устанавливаем размеры канваса
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (imgLoaded) {
            const fitImageToScreen = () => {
                const mapWidth = img.width;
                const mapHeight = img.height;

                const widthRatio = canvas.width / mapWidth;
                const heightRatio = canvas.height / mapHeight;

                const minRatio = Math.min(widthRatio, heightRatio);

                setScale(minRatio); // Масштабируем изображение
                setOffsetX(0); // Сбрасываем смещения
                setOffsetY(0);
            };

            fitImageToScreen();
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;

        const handleTouchStart = (e) => {
            if (e.touches.length === 1) {
                setIsDragging(true);
                const touch = e.touches[0];
                setStartX(touch.clientX);
                setStartY(touch.clientY);
            }
        };

        const handleTouchMove = (e) => {
            if (isDragging && e.touches.length === 1 && imgLoaded) {
                const touch = e.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;

                setOffsetX((prev) => clampOffset(prev + dx, 'x'));
                setOffsetY((prev) => clampOffset(prev + dy, 'y'));

                setStartX(touch.clientX);
                setStartY(touch.clientY);
            } else if (e.touches.length === 2) {
                // Обработка зума с двумя пальцами
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

                const midX = (touch1.clientX + touch2.clientX) / 2;
                const midY = (touch1.clientY + touch2.clientY) / 2;

                // Рассчитываем изменение масштаба с использованием ZOOM_STEP
                const scaleChange = (distance - 200) * ZOOM_STEP;
                const newScale = Math.min(Math.max(scale + scaleChange, MIN_SCALE), MAX_SCALE);

                if (newScale !== scale) {
                    const rect = canvas.getBoundingClientRect();
                    const midXCanvas = midX - rect.left;
                    const midYCanvas = midY - rect.top;

                    const imageMouseX = (midXCanvas - offsetX) / scale;
                    const imageMouseY = (midYCanvas - offsetY) / scale;

                    setScale(newScale);

                    const newImageMouseX = imageMouseX * newScale;
                    const newImageMouseY = imageMouseY * newScale;

                    let newOffsetX = midXCanvas - newImageMouseX;
                    let newOffsetY = midYCanvas - newImageMouseY;

                    // Проверяем границы
                    newOffsetX = clampOffset(newOffsetX, 'x', newScale);
                    newOffsetY = clampOffset(newOffsetY, 'y', newScale);

                    setOffsetX(newOffsetX);
                    setOffsetY(newOffsetY);
                }
            }
        };

        const handleTouchEnd = () => {
            setIsDragging(false);
        };

        const handleWheel = (e) => {
            e.preventDefault(); // Предотвращаем прокрутку страницы
            const scaleChange = Math.sign(e.deltaY) * ZOOM_STEP;
            const newScale = Math.min(Math.max(scale - scaleChange, MIN_SCALE), MAX_SCALE);

            const rect = canvas.getBoundingClientRect();
            const midX = e.clientX - rect.left; // Позиция зума по X
            const midY = e.clientY - rect.top;  // Позиция зума по Y

            if (newScale !== scale) {
                const imageMouseX = (midX - offsetX) / scale;
                const imageMouseY = (midY - offsetY) / scale;

                setScale(newScale);

                const newImageMouseX = imageMouseX * newScale;
                const newImageMouseY = imageMouseY * newScale;

                let newOffsetX = midX - newImageMouseX;
                let newOffsetY = midY - newImageMouseY;

                // Проверка границ
                newOffsetX = clampOffset(newOffsetX, 'x', newScale);
                newOffsetY = clampOffset(newOffsetY, 'y', newScale);

                setOffsetX(newOffsetX);
                setOffsetY(newOffsetY);
            }
        };

        const clampOffset = (value, axis, currentScale = scale) => {
            const mapWidth = img.width * currentScale;  // Ширина изображения с учетом масштаба
            const mapHeight = img.height * currentScale; // Высота изображения с учетом масштаба
            const { width, height } = canvasSize;

            if (axis === 'x') {
                if (value > 0) return 0; // Левый предел
                if (value < -(mapWidth - width)) return -(mapWidth - width); // Правый предел
            } else if (axis === 'y') {
                if (value > 0) return 0; // Верхний предел
                if (value < -(mapHeight - height)) return -(mapHeight - height); // Нижний предел
            }

            return value;
        };

        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('wheel', handleWheel);

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [isDragging, startX, startY, offsetX, offsetY, imgLoaded, canvasSize, scale]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height); // Очистка канваса
        
        if (imgLoaded) {
            context.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
        }

        // Рисуем маркер
        const markerX = 100;
        const markerY = 200;
        context.fillStyle = 'red'; // Цвет маркера
        context.beginPath();
        context.arc(markerX, markerY, 5, 0, Math.PI * 2); // Рисуем круг
        context.fill();
    }, [offsetX, offsetY, img, imgLoaded, scale]);

    useEffect(() => {
        const updateCanvasSize = () => {
            setCanvasSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
            updateCanvasAndScale(); // Обновляем размер и масштаб
        };

        window.addEventListener('resize', updateCanvasSize);
        updateCanvasSize(); // Обновляем размер сразу

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
        };
    }, []);

    const positionMarker = () => {
        const markerX = 100; // Координаты маркера
        const markerY = 200;

        const canvasMarkerX = markerX * scale + offsetX; // Изменено с currentX
        const canvasMarkerY = markerY * scale + offsetY; // Изменено с currentY

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
        const canvas = canvasRef.current;
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;

        if (imgLoaded) {
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
        }
        positionMarker();
    }, [canvasSize, img, imgLoaded, offsetX, offsetY, scale]);

    const handleDoubleClickMarker = () => {
    setShowRing(true);
    document.body.style.overflow = 'hidden'; // Отключаем прокрутку
    };

    const closeRing = () => {
        setShowRing(false); // Скрываем рендер кольца
        document.body.style.overflow = 'auto'; // Возвращаем прокрутку
    };

    return (
        <div className="map-container">
            <canvas ref={canvasRef} className="map-canvas" />
            <div ref={markerRef} className="marker" onClick={handleDoubleClickMarker}></div>
            {showRing && <Ring onClose={closeRing} />} {/* Отображаем кольцо с функцией закрытия */}
        </div>
    );
};

export default MapComponent;










