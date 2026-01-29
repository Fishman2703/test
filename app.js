// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем на весь экран
tg.setHeaderColor('#667eea');
tg.setBackgroundColor('#f5f5f5');

// Элементы DOM
const startScannerBtn = document.getElementById('startScanner');
const stopScannerBtn = document.getElementById('stopScanner');
const checkManualBtn = document.getElementById('checkManual');
const saveProductBtn = document.getElementById('saveProduct');
const clearHistoryBtn = document.getElementById('clearHistory');
const resultDiv = document.getElementById('result');
const historyList = document.getElementById('historyList');

// Переменные
let scanner = null;
let currentProduct = null;

// Функция для тестового режима (если не в Telegram)
function isTelegram() {
    return window.Telegram && window.Telegram.WebApp.initData;
}

// Загрузка истории из localStorage
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    historyList.innerHTML = '';
    
    history.slice(-10).reverse().forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>Код: ${item.barcode}</small>
            </div>
            <div style="text-align: right;">
                ${item.calories} ккал<br>
                <small>${item.protein}Б/${item.fat}Ж/${item.carbs}У</small>
            </div>
        `;
        historyList.appendChild(div);
    });
}

// Поиск продукта по API Open Food Facts
async function searchProduct(barcode) {
    try {
        showLoading(true);
        
        // Тестовые данные (если API не отвечает)
        const testProducts = {
            '3017620422003': {
                name: 'Nutella',
                brand: 'Ferrero',
                calories: '530',
                protein: '6.3',
                fat: '30.9',
                carbs: '57.5',
                weight: '400g'
            },
            '7622210288257': {
                name: 'Oreo Original',
                brand: 'Oreo',
                calories: '474',
                protein: '5.2',
                fat: '20',
                carbs: '69',
                weight: '154g'
            },
            '5901234123457': {
                name: 'Пример продукта',
                brand: 'Пример бренда',
                calories: '250',
                protein: '10',
                fat: '5',
                carbs: '30',
                weight: '100g'
            }
        };
        
        // Если есть тестовые данные - используем их
        if (testProducts[barcode]) {
            setTimeout(() => {
                displayProduct(testProducts[barcode], barcode);
                showLoading(false);
            }, 800);
            return;
        }
        
        // Реальный запрос к API
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();
        
        if (data.status === 1) {
            const product = data.product;
            displayProduct({
                name: product.product_name || 'Неизвестный продукт',
                brand: product.brands || 'Не указано',
                calories: product.nutriments?.energy || 
                         (product.nutriments?.['energy-kcal'] || 
                          product.nutriments?.['energy-kcal_100g'] || '0'),
                protein: product.nutriments?.proteins || 
                         product.nutriments?.['proteins_100g'] || '0',
                fat: product.nutriments?.fat || 
                     product.nutriments?.['fat_100g'] || '0',
                carbs: product.nutriments?.carbohydrates || 
                       product.nutriments?.['carbohydrates_100g'] || '0',
                weight: product.quantity || 'Не указано'
            }, barcode);
        } else {
            alert('Продукт не найден в базе. Попробуйте другой штрих-код.');
        }
    } catch (error) {
        console.error('Ошибка при поиске:', error);
        alert('Ошибка при подключении к базе данных. Проверьте интернет.');
    } finally {
        showLoading(false);
    }
}

// Отображение продукта
function displayProduct(product, barcode) {
    currentProduct = { ...product, barcode };
    
    document.getElementById('productName').textContent = product.name;
    document.getElementById('calories').textContent = `${product.calories} ккал`;
    document.getElementById('protein').textContent = `${product.protein} г`;
    document.getElementById('fat').textContent = `${product.fat} г`;
    document.getElementById('carbs').textContent = `${product.carbs} г`;
    document.getElementById('brand').textContent = product.brand;
    document.getElementById('weight').textContent = product.weight;
    document.getElementById('barcode').textContent = barcode;
    
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth' });
    
    // Отправляем данные в Telegram (если в мини-приложении)
    if (isTelegram()) {
        tg.sendData(JSON.stringify({
            action: 'product_scanned',
            barcode: barcode,
            name: product.name,
            calories: product.calories
        }));
    }
}

// Показать/скрыть загрузку
function showLoading(show) {
    if (show) {
        startScannerBtn.disabled = true;
        startScannerBtn.innerHTML = '⏳ Загрузка...';
    } else {
        startScannerBtn.disabled = false;
        startScannerBtn.innerHTML = '🎥 Включить сканер';
    }
}

// Инициализация сканера
// Инициализация сканера
async function initScanner() {
    console.log('Инициализация сканера...');
    
    // Проверяем поддержку API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Ваш браузер не поддерживает доступ к камере. Пожалуйста, используйте ручной ввод.');
        return;
    }
    
    try {
        // Запрашиваем доступ к камере
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Задняя камера
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        // Скрываем кнопку запуска, показываем кнопку остановки
        startScannerBtn.style.display = 'none';
        stopScannerBtn.style.display = 'inline-block';
        
        // Создаём видео элемент для камеры
        const scannerContainer = document.getElementById('qr-reader');
        scannerContainer.innerHTML = `
            <div style="position: relative;">
                <video id="cameraPreview" autoplay playsinline 
                       style="width: 100%; border-radius: 10px; border: 3px solid #4facfe;">
                </video>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                           width: 250px; height: 250px; border: 3px dashed #fff; pointer-events: none;">
                    <div style="position: absolute; top: 5px; left: 5px; color: white; font-size: 12px;">
                        🎯 Наведите на штрих-код
                    </div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button id="switchCamera" class="btn" style="background: #6c757d; color: white;">
                    🔄 Переключить камеру
                </button>
            </div>
        `;
        
        // Настраиваем видео поток
        const video = document.getElementById('cameraPreview');
        video.srcObject = stream;
        
        // Загружаем библиотеку для распознавания штрих-кодов
        await loadBarcodeScanner();
        
        // Запускаем распознавание
        startBarcodeDetection(video);
        
        // Переключение камеры
        document.getElementById('switchCamera').addEventListener('click', () => {
            switchCamera(stream, video);
        });
        
        // Сохраняем поток для остановки
        window.currentStream = stream;
        
    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
        handleCameraError(error);
    }
}

// Загрузка библиотеки для распознавания штрих-кодов
function loadBarcodeScanner() {
    return new Promise((resolve) => {
        // Используем библиотеку ZXing
        if (!window.BarcodeDetector) {
            // Загружаем полифил
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
            script.onload = () => {
                console.log('ZXing библиотека загружена');
                resolve();
            };
            document.head.appendChild(script);
        } else {
            resolve();
        }
    });
}

// Распознавание штрих-кодов
async function startBarcodeDetection(video) {
    let lastDetection = 0;
    const detectionDelay = 1000; // 1 секунда между распознаваниями
    
    try {
        // Создаём детектор
        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
        });
        
        console.log('Детектор штрих-кодов создан');
        
        // Функция для обработки кадра
        async function detectFrame() {
            if (!window.isScanningActive) return;
            
            try {
                const barcodes = await barcodeDetector.detect(video);
                
                if (barcodes.length > 0) {
                    const now = Date.now();
                    if (now - lastDetection > detectionDelay) {
                        lastDetection = now;
                        const barcode = barcodes[0];
                        console.log('Найден штрих-код:', barcode.rawValue);
                        
                        // Останавливаем сканирование
                        stopScanner();
                        
                        // Ищем продукт
                        searchProduct(barcode.rawValue);
                        
                        // Звуковой сигнал (опционально)
                        playBeepSound();
                    }
                }
                
                // Продолжаем сканирование
                if (window.isScanningActive) {
                    requestAnimationFrame(detectFrame);
                }
            } catch (err) {
                console.log('Ожидание штрих-кода...');
                if (window.isScanningActive) {
                    setTimeout(detectFrame, 500);
                }
            }
        }
        
        window.isScanningActive = true;
        detectFrame();
        
    } catch (error) {
        console.error('Ошибка детектора:', error);
        
        // Альтернативный метод через библиотеку QuaggaJS
        loadQuaggaJS(video);
    }
}

// Альтернативный метод через QuaggaJS
function loadQuaggaJS(video) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
    script.onload = () => {
        console.log('QuaggaJS загружена');
        
        // Создаём canvas для захвата кадра
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        function captureAndDecode() {
            if (!window.isScanningActive) return;
            
            // Захватываем кадр
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Конвертируем в ImageData
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Пытаемся распознать
            Quagga.decodeSingle(
                {
                    src: canvas.toDataURL(),
                    numOfWorkers: 0,
                    inputStream: {
                        size: 800
                    },
                    decoder: {
                        readers: ['ean_reader', 'ean_8_reader', 'code_128_reader']
                    }
                },
                function(result) {
                    if (result && result.codeResult) {
                        console.log('Quagga найден код:', result.codeResult.code);
                        stopScanner();
                        searchProduct(result.codeResult.code);
                        playBeepSound();
                    } else {
                        // Продолжаем сканирование
                        setTimeout(captureAndDecode, 500);
                    }
                }
            );
        }
        
        window.isScanningActive = true;
        captureAndDecode();
    };
    document.head.appendChild(script);
}

// Переключение камеры
async function switchCamera(oldStream, video) {
    try {
        // Останавливаем старый поток
        oldStream.getTracks().forEach(track => track.stop());
        
        // Определяем текущую камеру
        const currentFacingMode = oldStream.getVideoTracks()[0].getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        // Запрашиваем новую камеру
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: newFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        video.srcObject = stream;
        window.currentStream = stream;
        
        console.log('Камера переключена на:', newFacingMode);
        
    } catch (error) {
        console.error('Ошибка переключения камеры:', error);
        alert('Не удалось переключить камеру');
    }
}

// Остановка сканера
function stopScanner() {
    console.log('Остановка сканера...');
    
    window.isScanningActive = false;
    
    // Останавливаем видео поток
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }
    
    // Восстанавливаем кнопки
    startScannerBtn.style.display = 'inline-block';
    stopScannerBtn.style.display = 'none';
    
    // Очищаем контейнер
    const scannerContainer = document.getElementById('qr-reader');
    scannerContainer.innerHTML = '<div style="text-align: center; color: #666;">Сканер выключен</div>';
}

// Обработка ошибок камеры
function handleCameraError(error) {
    console.error('Camera error:', error);
    
    let message = 'Не удалось получить доступ к камере. ';
    
    switch (error.name) {
        case 'NotAllowedError':
            message += 'Вы запретили доступ к камере. Разрешите доступ в настройках браузера.';
            break;
        case 'NotFoundError':
            message += 'Камера не найдена. Убедитесь, что камера подключена.';
            break;
        case 'NotSupportedError':
            message += 'Ваш браузер не поддерживает доступ к камере. Попробуйте другой браузер.';
            break;
        case 'NotReadableError':
            message += 'Камера уже используется другим приложением.';
            break;
        default:
            message += 'Неизвестная ошибка: ' + error.message;
    }
    
    alert(message);
    
    // Показываем альтернативный вариант - использование файла
    showFileUploadOption();
}

// Альтернатива: загрузка фото
function showFileUploadOption() {
    const scannerContainer = document.getElementById('qr-reader');
    scannerContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>📷 Альтернативный способ</h3>
            <p>Сфотографируйте штрих-код и загрузите фото:</p>
            <input type="file" id="fileInput" accept="image/*" capture="environment" 
                   style="display: none;">
            <button id="uploadPhoto" class="btn btn-primary">
                📸 Сфотографировать штрих-код
            </button>
            <div id="previewContainer" style="margin-top: 15px;"></div>
        </div>
    `;
    
    document.getElementById('uploadPhoto').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            processImageFile(file);
        }
    });
}

// Обработка загруженного изображения
async function processImageFile(file) {
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = async function() {
            // Создаём canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Показываем превью
            const preview = document.getElementById('previewContainer');
            preview.innerHTML = `
                <img src="${img.src}" style="max-width: 300px; border-radius: 10px;">
                <p>⏳ Анализ изображения...</p>
            `;
            
            // Пытаемся распознать штрих-код
            try {
                const barcodeDetector = new BarcodeDetector({
                    formats: ['ean_13', 'ean_8', 'upc_a']
                });
                
                const barcodes = await barcodeDetector.detect(img);
                
                if (barcodes.length > 0) {
                    const barcode = barcodes[0].rawValue;
                    preview.innerHTML += `<p style="color: green;">✅ Найден код: ${barcode}</p>`;
                    searchProduct(barcode);
                } else {
                    preview.innerHTML += `<p style="color: red;">❌ Штрих-код не найден на фото</p>`;
                }
            } catch (error) {
                preview.innerHTML += `<p style="color: red;">❌ Ошибка распознавания</p>`;
            }
        };
    };
    
    reader.readAsDataURL(file);
}

// Звуковой сигнал
function playBeepSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Звук не поддерживается');
    }
}

// Сохранение в историю
function saveToHistory() {
    if (!currentProduct) return;
    
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    history.push({
        ...currentProduct,
        date: new Date().toLocaleString()
    });
    
    localStorage.setItem('bjuHistory', JSON.stringify(history));
    loadHistory();
    
    alert('✅ Продукт сохранён в историю!');
}

// Очистка истории
function clearHistory() {
    if (confirm('Вы уверены, что хотите очистить всю историю?')) {
        localStorage.removeItem('bjuHistory');
        loadHistory();
    }
}

// События
startScannerBtn.addEventListener('click', initScanner);
stopScannerBtn.addEventListener('click', stopScanner);
checkManualBtn.addEventListener('click', () => {
    const barcode = document.getElementById('manualBarcode').value.trim();
    if (barcode.length >= 8) {
        searchProduct(barcode);
    } else {
        alert('Введите корректный штрих-код (минимум 8 цифр)');
    }
});
saveProductBtn.addEventListener('click', saveToHistory);
clearHistoryBtn.addEventListener('click', clearHistory);

// Enter в поле ввода
document.getElementById('manualBarcode').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkManualBtn.click();
    }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    
    // Если запущено в Telegram, показываем кнопку закрытия
    if (isTelegram()) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary';
        closeBtn.innerHTML = '❌ Закрыть';
        closeBtn.style.position = 'fixed';
        closeBtn.style.top = '10px';
        closeBtn.style.right = '10px';
        closeBtn.style.zIndex = '1000';
        closeBtn.onclick = () => tg.close();
        document.body.appendChild(closeBtn);
    }
});