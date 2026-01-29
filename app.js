// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
if (tg && tg.initData) {
    tg.expand(); // Раскрываем на весь экран
    tg.setHeaderColor('#667eea');
    tg.setBackgroundColor('#f5f5f5');
}

// Элементы DOM
const startScannerBtn = document.getElementById('startScanner');
const stopScannerBtn = document.getElementById('stopScanner');
const checkManualBtn = document.getElementById('checkManual');
const saveProductBtn = document.getElementById('saveProduct');
const clearHistoryBtn = document.getElementById('clearHistory');
const resultDiv = document.getElementById('result');
const historyList = document.getElementById('historyList');

// Переменные
let currentStream = null;
let currentProduct = null;
let currentRotation = 0;
let isScanningActive = false;
let barcodeDetector = null;

// Загрузка истории из localStorage
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    historyList.innerHTML = '';
    
    // Показываем последние 10 записей
    history.slice(-10).reverse().forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div style="flex: 1;">
                <strong>${item.name || 'Неизвестный продукт'}</strong><br>
                <small>${item.date || ''} | Код: ${item.barcode || 'нет'}</small>
            </div>
            <div style="text-align: right;">
                ${item.calories || '0'} ккал<br>
                <small>${item.protein || '0'}Б/${item.fat || '0'}Ж/${item.carbs || '0'}У</small>
            </div>
        `;
        
        // Добавляем обработчик клика для повторного поиска
        div.addEventListener('click', () => {
            if (item.barcode) {
                searchProduct(item.barcode);
            }
        });
        
        historyList.appendChild(div);
    });
}

// Показать/скрыть загрузку
function showLoading(show) {
    if (show) {
        startScannerBtn.disabled = true;
        checkManualBtn.disabled = true;
        startScannerBtn.innerHTML = '⏳ Загрузка...';
    } else {
        startScannerBtn.disabled = false;
        checkManualBtn.disabled = false;
        startScannerBtn.innerHTML = '🎥 Включить сканер';
    }
}

// Поиск продукта по API Open Food Facts
async function searchProduct(barcode) {
    try {
        showLoading(true);
        
        // Тестовые данные
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
                name: 'Шоколад молочный',
                brand: 'Пример бренда',
                calories: '550',
                protein: '8',
                fat: '32',
                carbs: '55',
                weight: '100g'
            },
            '4014400900508': {
                name: 'Red Bull Energy Drink',
                brand: 'Red Bull',
                calories: '45',
                protein: '0',
                fat: '0',
                carbs: '11',
                weight: '250ml'
            },
            '5449000000996': {
                name: 'Coca-Cola Classic',
                brand: 'Coca-Cola',
                calories: '42',
                protein: '0',
                fat: '0',
                carbs: '10.6',
                weight: '330ml'
            }
        };
        
        // Если есть тестовые данные
        if (testProducts[barcode]) {
            setTimeout(() => {
                displayProduct(testProducts[barcode], barcode);
                showLoading(false);
            }, 500);
            return;
        }
        
        // Реальный запрос к API
        console.log(`Поиск продукта с кодом: ${barcode}`);
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        
        if (!response.ok) {
            throw new Error(`Ошибка API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 1 && data.product) {
            const product = data.product;
            displayProduct({
                name: product.product_name || product.product_name_ru || 'Неизвестный продукт',
                brand: product.brands || product.brand_owner || 'Не указано',
                calories: product.nutriments?.['energy-kcal'] || 
                         product.nutriments?.['energy-kcal_100g'] || 
                         product.nutriments?.energy || '0',
                protein: product.nutriments?.proteins || 
                        product.nutriments?.['proteins_100g'] || '0',
                fat: product.nutriments?.fat || 
                     product.nutriments?.['fat_100g'] || '0',
                carbs: product.nutriments?.carbohydrates || 
                       product.nutriments?.['carbohydrates_100g'] || '0',
                weight: product.quantity || 
                       (product.product_quantity ? product.product_quantity + 'g' : 'Не указано')
            }, barcode);
        } else {
            // Если продукт не найден, создаём шаблонный
            displayProduct({
                name: `Продукт ${barcode}`,
                brand: 'Неизвестный бренд',
                calories: '0',
                protein: '0',
                fat: '0',
                carbs: '0',
                weight: 'Не указано'
            }, barcode);
        }
    } catch (error) {
        console.error('Ошибка при поиске:', error);
        alert('Ошибка при подключении к базе данных. Используем тестовые данные.');
        
        // Показываем тестовые данные при ошибке
        displayProduct({
            name: 'Пример продукта',
            brand: 'Тестовый бренд',
            calories: '250',
            protein: '10',
            fat: '5',
            carbs: '30',
            weight: '100g'
        }, barcode || '0000000000000');
    } finally {
        showLoading(false);
    }
}

// Отображение продукта
function displayProduct(product, barcode) {
    currentProduct = { 
        ...product, 
        barcode,
        date: new Date().toLocaleString('ru-RU')
    };
    
    // Обновляем UI
    document.getElementById('productName').textContent = product.name;
    document.getElementById('calories').textContent = `${product.calories} ккал`;
    document.getElementById('protein').textContent = `${product.protein} г`;
    document.getElementById('fat').textContent = `${product.fat} г`;
    document.getElementById('carbs').textContent = `${product.carbs} г`;
    document.getElementById('brand').textContent = product.brand;
    document.getElementById('weight').textContent = product.weight;
    document.getElementById('barcode').textContent = barcode;
    
    // Показываем результат с анимацией
    resultDiv.style.display = 'block';
    resultDiv.style.animation = 'fadeIn 0.5s ease';
    
    // Прокручиваем к результату
    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    // Автоматически сохраняем в историю
    saveToHistory();
    
    // Отправляем данные в Telegram (если в мини-приложении)
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            action: 'product_scanned',
            barcode: barcode,
            name: product.name,
            calories: product.calories,
            protein: product.protein,
            fat: product.fat,
            carbs: product.carbs
        }));
    }
    
    // Воспроизводим звук успеха
    playSuccessSound();
}

// Инициализация сканера
async function initScanner() {
    console.log('Инициализация сканера...');
    
    // Проверяем поддержку API камеры
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showCameraError('Ваш браузер не поддерживает доступ к камере. Пожалуйста, используйте ручной ввод.');
        return;
    }
    
    try {
        // Запрашиваем доступ к камере
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Используем заднюю камеру
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        // Сохраняем поток
        currentStream = stream;
        isScanningActive = true;
        
        // Обновляем UI
        startScannerBtn.style.display = 'none';
        stopScannerBtn.style.display = 'inline-block';
        
        // Создаём интерфейс сканера
        createScannerUI(stream);
        
        // Настраиваем видео
        const video = document.getElementById('cameraPreview');
        video.srcObject = stream;
        
        // Настраиваем отображение камеры
        setupCameraView(video, stream);
        
        // Запускаем распознавание штрих-кодов
        startBarcodeDetection(video);
        
        // Настройка обработчиков кнопок
        setupScannerButtons(video, stream);
        
        console.log('Сканер успешно запущен');
        
    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
        handleCameraError(error);
    }
}

// Создание интерфейса сканера
function createScannerUI(stream) {
    const scannerContainer = document.getElementById('qr-reader');
    scannerContainer.innerHTML = `
        <div class="camera-container">
            <video id="cameraPreview" autoplay playsinline muted 
                   style="width: 100%; height: auto; border-radius: 10px;"></video>
            <div class="scan-overlay">
                <div class="scan-line"></div>
                <div style="position: absolute; top: -30px; left: 10px; 
                           color: white; font-size: 12px; background: rgba(0,0,0,0.7); 
                           padding: 2px 5px; border-radius: 3px;">
                    🎯 Наведите на штрих-код
                </div>
            </div>
            <div class="scan-hint">
                Держите камеру параллельно штрих-коду
            </div>
        </div>
        <div class="camera-controls">
            <button id="switchCamera" class="btn" style="background: #6c757d; color: white; margin: 5px;">
                🔄 Камера
            </button>
            <button id="toggleTorch" class="btn" style="background: #ffa502; color: white; margin: 5px;">
                🔦 Фонарик
            </button>
            <button id="rotateView" class="btn" style="background: #2ed573; color: white; margin: 5px;">
                ↻ Повернуть
            </button>
        </div>
    `;
}

// Настройка отображения камеры
function setupCameraView(videoElement, stream) {
    try {
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        
        // Определяем тип камеры по facingMode
        const isFrontCamera = settings.facingMode === 'user' || 
                             settings.facingMode === 'left' || 
                             settings.facingMode === 'right' ||
                             !settings.facingMode;
        
        // Применяем правильное отображение
        if (isFrontCamera) {
            // Фронтальная камера - зеркальное отображение (как в селфи)
            videoElement.style.transform = 'scaleX(-1)';
        } else {
            // Задняя камера - нормальное отображение
            videoElement.style.transform = 'scaleX(1)';
        }
        
        // Сохраняем информацию о камере
        videoElement.dataset.cameraType = isFrontCamera ? 'front' : 'back';
        videoElement.dataset.rotation = '0';
        
        console.log('Камера настроена:', 
                   isFrontCamera ? 'Фронтальная' : 'Задняя',
                   `(${settings.facingMode || 'неизвестно'})`);
        
    } catch (error) {
        console.warn('Не удалось определить тип камеры:', error);
        // По умолчанию используем нормальное отображение
        videoElement.style.transform = 'scaleX(1)';
    }
}

// Запуск распознавания штрих-кодов
async function startBarcodeDetection(video) {
    console.log('Запуск распознавания штрих-кодов...');
    
    // Проверяем поддержку BarcodeDetector API
    if ('BarcodeDetector' in window) {
        try {
            // Создаём детектор штрих-кодов
            barcodeDetector = new BarcodeDetector({
                formats: [
                    'ean_13', 'ean_8', 'upc_a', 'upc_e',
                    'code_128', 'code_39', 'code_93',
                    'codabar', 'itf', 'qr_code', 'data_matrix'
                ]
            });
            
            // Тестируем детектор
            const supportedFormats = await BarcodeDetector.getSupportedFormats();
            console.log('Поддерживаемые форматы:', supportedFormats);
            
            // Запускаем цикл распознавания
            detectBarcodes(video);
            
        } catch (error) {
            console.error('Ошибка BarcodeDetector:', error);
            // Используем резервный метод
            useBackupBarcodeDetection(video);
        }
    } else {
        console.log('BarcodeDetector не поддерживается, используем резервный метод');
        useBackupBarcodeDetection(video);
    }
}

// Основной цикл распознавания штрих-кодов
async function detectBarcodes(video) {
    if (!isScanningActive || !barcodeDetector) return;
    
    try {
        const barcodes = await barcodeDetector.detect(video);
        
        if (barcodes.length > 0) {
            const barcode = barcodes[0];
            console.log('Найден штрих-код:', barcode.rawValue, 'Формат:', barcode.format);
            
            // Останавливаем сканирование
            stopScanner();
            
            // Ищем продукт
            searchProduct(barcode.rawValue);
            
            // Воспроизводим звук
            playScanSound();
            
            return; // Прерываем цикл
        }
    } catch (error) {
        // Игнорируем ошибки детектирования, продолжаем сканирование
    }
    
    // Продолжаем сканирование
    if (isScanningActive) {
        requestAnimationFrame(() => detectBarcodes(video));
    }
}

// Резервный метод распознавания (через ZXing)
function useBackupBarcodeDetection(video) {
    console.log('Используем резервный метод распознавания...');
    
    // Загружаем ZXing библиотеку
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
    
    script.onload = () => {
        console.log('ZXing библиотека загружена');
        
        const codeReader = new ZXing.BrowserMultiFormatReader();
        
        // Создаём canvas для захвата кадра
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        function captureAndDecode() {
            if (!isScanningActive) return;
            
            try {
                // Устанавливаем размеры canvas под видео
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                
                // Рисуем кадр видео на canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Распознаём штрих-код
                codeReader.decodeFromCanvas(canvas)
                    .then(result => {
                        console.log('ZXing найден код:', result.text);
                        
                        // Останавливаем сканирование
                        stopScanner();
                        
                        // Ищем продукт
                        searchProduct(result.text);
                        
                        // Воспроизводим звук
                        playScanSound();
                    })
                    .catch(() => {
                        // Штрих-код не найден, продолжаем
                        if (isScanningActive) {
                            setTimeout(captureAndDecode, 300);
                        }
                    });
                    
            } catch (error) {
                console.error('Ошибка захвата кадра:', error);
                if (isScanningActive) {
                    setTimeout(captureAndDecode, 500);
                }
            }
        }
        
        // Запускаем распознавание
        captureAndDecode();
    };
    
    script.onerror = () => {
        console.error('Не удалось загрузить ZXing библиотеку');
        showCameraError('Не удалось загрузить библиотеку распознавания. Используйте ручной ввод.');
    };
    
    document.head.appendChild(script);
}

// Настройка кнопок сканера
function setupScannerButtons(video, stream) {
    // Переключение камеры
    document.getElementById('switchCamera').addEventListener('click', () => {
        switchCamera(stream, video);
    });
    
    // Фонарик
    document.getElementById('toggleTorch').addEventListener('click', () => {
        toggleTorch(stream);
    });
    
    // Поворот вида
    document.getElementById('rotateView').addEventListener('click', () => {
        rotateCameraView(video);
    });
}

// Переключение камеры
async function switchCamera(oldStream, video) {
    try {
        // Останавливаем старый поток
        oldStream.getTracks().forEach(track => track.stop());
        
        // Определяем текущую камеру
        const track = oldStream.getVideoTracks()[0];
        const settings = track.getSettings();
        const currentFacingMode = settings.facingMode;
        
        // Выбираем противоположную камеру
        let newFacingMode;
        if (currentFacingMode === 'environment') {
            newFacingMode = 'user'; // Переключаем на фронтальную
        } else {
            newFacingMode = 'environment'; // Переключаем на заднюю
        }
        
        console.log('Переключение камеры с', currentFacingMode, 'на', newFacingMode);
        
        // Запрашиваем новую камеру
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: newFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        // Обновляем видео и поток
        video.srcObject = newStream;
        currentStream = newStream;
        
        // Настраиваем отображение
        setupCameraView(video, newStream);
        
        // Сбрасываем поворот
        currentRotation = 0;
        video.style.transform = video.dataset.cameraType === 'front' ? 'scaleX(-1)' : 'scaleX(1)';
        
        console.log('Камера успешно переключена');
        
    } catch (error) {
        console.error('Ошибка переключения камеры:', error);
        alert('Не удалось переключить камеру. Возможно, она не поддерживается.');
    }
}

// Управление фонариком
async function toggleTorch(stream) {
    try {
        const track = stream.getVideoTracks()[0];
        
        // Проверяем поддержку фонарика
        if (track.getCapabilities && 'torch' in track.getCapabilities()) {
            await track.applyConstraints({
                advanced: [{ torch: !track.getConstraints().torch }]
            });
            
            const torchBtn = document.getElementById('toggleTorch');
            const isTorchOn = track.getConstraints().torch;
            
            torchBtn.innerHTML = isTorchOn ? '💡 Выкл.' : '🔦 Вкл.';
            torchBtn.style.background = isTorchOn ? '#ff6348' : '#ffa502';
            
            console.log('Фонарик:', isTorchOn ? 'включен' : 'выключен');
        } else {
            alert('Ваше устройство не поддерживает фонарик');
        }
    } catch (error) {
        console.error('Ошибка управления фонариком:', error);
        alert('Не удалось включить фонарик');
    }
}

// Поворот вида камеры
function rotateCameraView(video) {
    const rotations = [0, 90, 180, 270];
    currentRotation = (currentRotation + 1) % rotations.length;
    
    const rotation = rotations[currentRotation];
    const cameraType = video.dataset.cameraType || 'back';
    const baseTransform = cameraType === 'front' ? 'scaleX(-1)' : 'scaleX(1)';
    
    video.style.transform = `${baseTransform} rotate(${rotation}deg)`;
    video.dataset.rotation = rotation;
    
    // Обновляем подсказку
    const hints = [
        'Держите камеру горизонтально',
        'Поверните телефон на 90° вправо',
        'Переверните телефон',
        'Поверните телефон на 90° влево'
    ];
    
    const hintElement = document.querySelector('.scan-hint');
    if (hintElement) {
        hintElement.textContent = hints[currentRotation];
    }
    
    console.log('Поворот камеры:', rotation, 'градусов');
}

// Остановка сканера
function stopScanner() {
    console.log('Остановка сканера...');
    
    isScanningActive = false;
    
    // Останавливаем видео поток
    if (currentStream) {
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
        currentStream = null;
    }
    
    // Восстанавливаем кнопки
    startScannerBtn.style.display = 'inline-block';
    stopScannerBtn.style.display = 'none';
    
    // Очищаем контейнер сканера
    const scannerContainer = document.getElementById('qr-reader');
    scannerContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Сканер выключен. Нажмите "Включить сканер" для повторного сканирования.</div>';
    
    console.log('Сканер остановлен');
}

// Обработка ошибок камеры
function handleCameraError(error) {
    console.error('Ошибка камеры:', error);
    
    let message = 'Не удалось получить доступ к камере. ';
    
    switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
            message += 'Вы запретили доступ к камере. Разрешите доступ в настройках браузера.';
            break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            message += 'Камера не найдена. Убедитесь, что камера подключена и работает.';
            break;
        case 'NotSupportedError':
            message += 'Ваш браузер не поддерживает доступ к камере. Попробуйте Chrome или Safari.';
            break;
        case 'NotReadableError':
        case 'TrackStartError':
            message += 'Камера уже используется другим приложением. Закройте другие приложения, использующие камеру.';
            break;
        case 'OverconstrainedError':
            message += 'Не удалось найти камеру с требуемыми параметрами.';
            break;
        case 'AbortError':
            message += 'Доступ к камере был прерван.';
            break;
        default:
            message += `Ошибка: ${error.message || 'неизвестная ошибка'}`;
    }
    
    showCameraError(message);
}

// Показать ошибку камеры с альтернативными вариантами
function showCameraError(message) {
    alert(message);
    
    // Показываем альтернативные варианты
    const scannerContainer = document.getElementById('qr-reader');
    scannerContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3 style="color: #dc3545;">📷 Камера недоступна</h3>
            <p>${message}</p>
            
            <div style="margin: 20px 0;">
                <h4>🎯 Альтернативные способы:</h4>
                
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                    <button id="uploadPhotoBtn" class="btn" style="background: #4facfe; color: white;">
                        📸 Загрузить фото со штрих-кодом
                    </button>
                    
                    <button id="useTestBarcodeBtn" class="btn" style="background: #28a745; color: white;">
                        🧪 Использовать тестовый штрих-код
                    </button>
                    
                    <button id="manualInputBtn" class="btn" style="background: #6c757d; color: white;">
                        ⌨️ Ввести код вручную
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Обработчики для альтернативных кнопок
    document.getElementById('uploadPhotoBtn').addEventListener('click', showFileUpload);
    document.getElementById('useTestBarcodeBtn').addEventListener('click', () => {
        searchProduct('3017620422003'); // Nutella
    });
    document.getElementById('manualInputBtn').addEventListener('click', () => {
        document.getElementById('manualBarcode').focus();
    });
}

// Загрузка фото со штрих-кодом
function showFileUpload() {
    const scannerContainer = document.getElementById('qr-reader');
    scannerContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>📷 Загрузите фото со штрих-кодом</h3>
            <p>Сфотографируйте штрих-код и загрузите фото:</p>
            
            <div style="margin: 20px;">
                <input type="file" id="fileInput" accept="image/*" capture="environment" 
                       style="display: none;">
                <button id="takePhotoBtn" class="btn" style="background: #4facfe; color: white; margin: 5px;">
                    📸 Сделать фото
                </button>
                <button id="chooseFileBtn" class="btn" style="background: #6c757d; color: white; margin: 5px;">
                    📁 Выбрать файл
                </button>
            </div>
            
            <div id="photoPreview" style="margin-top: 20px;"></div>
            <div id="scanResult" style="margin-top: 10px;"></div>
        </div>
    `;
    
    document.getElementById('takePhotoBtn').addEventListener('click', () => {
        document.getElementById('fileInput').setAttribute('capture', 'environment');
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('chooseFileBtn').addEventListener('click', () => {
        document.getElementById('fileInput').removeAttribute('capture');
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
    const preview = document.getElementById('photoPreview');
    const resultDiv = document.getElementById('scanResult');
    
    preview.innerHTML = '<p>⏳ Обработка изображения...</p>';
    resultDiv.innerHTML = '';
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = async function() {
            // Показываем превью
            preview.innerHTML = `
                <img src="${img.src}" style="max-width: 300px; border-radius: 10px; border: 2px solid #ddd;">
                <p>🔍 Анализ изображения...</p>
            `;
            
            try {
                // Пытаемся распознать штрих-код через BarcodeDetector
                if ('BarcodeDetector' in window) {
                    const detector = new BarcodeDetector({
                        formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39']
                    });
                    
                    const barcodes = await detector.detect(img);
                    
                    if (barcodes.length > 0) {
                        const barcode = barcodes[0].rawValue;
                        resultDiv.innerHTML = `
                            <div style="background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin: 10px 0;">
                                ✅ Найден штрих-код: <strong>${barcode}</strong>
                            </div>
                            <button id="searchThisBarcode" class="btn" style="background: #28a745; color: white;">
                                🔍 Найти продукт
                            </button>
                        `;
                        
                        document.getElementById('searchThisBarcode').addEventListener('click', () => {
                            searchProduct(barcode);
                        });
                    } else {
                        resultDiv.innerHTML = `
                            <div style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px;">
                                ❌ Штрих-код не найден на фото. Попробуйте другое фото.
                            </div>
                        `;
                    }
                } else {
                    // Альтернативный метод, если BarcodeDetector не поддерживается
                    resultDiv.innerHTML = `
                        <div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px;">
                            ⚠️ Распознавание изображений не поддерживается. Введите код вручную.
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Ошибка распознавания:', error);
                resultDiv.innerHTML = `
                    <div style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px;">
                        ❌ Ошибка распознавания: ${error.message}
                    </div>
                `;
            }
        };
    };
    
    reader.readAsDataURL(file);
}

// Сохранение в историю
function saveToHistory() {
    if (!currentProduct) return;
    
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    // Проверяем, нет ли уже такого продукта в истории
    const existingIndex = history.findIndex(item => item.barcode === currentProduct.barcode);
    
    if (existingIndex !== -1) {
        // Обновляем существующую запись
        history[existingIndex] = currentProduct;
    } else {
        // Добавляем новую запись
        history.push(currentProduct);
    }
    
    // Сохраняем (максимум 50 записей)
    const limitedHistory = history.slice(-50);
    localStorage.setItem('bjuHistory', JSON.stringify(limitedHistory));
    
    // Обновляем отображение истории
    loadHistory();
    
    console.log('Продукт сохранён в историю:', currentProduct.name);
}

// Очистка истории
function clearHistory() {
    if (confirm('Вы уверены, что хотите очистить всю историю сканирований?')) {
        localStorage.removeItem('bjuHistory');
        loadHistory();
        
        // Показываем подтверждение
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        notification.textContent = '✅ История очищена';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }
}

// Звук успешного сканирования
function playScanSound() {
    try {
        // Создаём простой бип-звук
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Игнорируем ошибки звука
    }
}

// Звук успешного поиска
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Два коротких бипа
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        
    } catch (e) {
        // Игнорируем ошибки звука
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Приложение загружено');
    
    // Загружаем историю
    loadHistory();
    
    // Проверяем, запущено ли в Telegram
    if (tg && tg.initData) {
        console.log('Запущено в Telegram Web App');
        
        // Добавляем кнопку закрытия
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn';
        closeBtn.innerHTML = '✕ Закрыть';
        closeBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            z-index: 1000;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.onclick = () => {
            if (tg && tg.close) {
                tg.close();
            }
        };
        document.body.appendChild(closeBtn);
    } else {
        console.log('Запущено в браузере');
    }
    
    // Назначаем обработчики событий
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
    
    // Enter в поле ручного ввода
    document.getElementById('manualBarcode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkManualBtn.click();
        }
    });
    
    // Автофокус на поле ввода при загрузке
    document.getElementById('manualBarcode').focus();
    
    // Проверяем поддержку камеры при загрузке
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Камера не поддерживается в этом браузере');
        showCameraError('Ваш браузер не поддерживает доступ к камере. Используйте ручной ввод или загрузку фото.');
    }
    
    console.log('Приложение готово к работе');
});

// Глобальные переменные для отладки
window.debugApp = {
    clearHistory: () => {
        localStorage.clear();
        loadHistory();
        console.log('Все данные очищены');
    },
    testScan: (barcode) => {
        searchProduct(barcode || '3017620422003');
    },
    getHistory: () => {
        return JSON.parse(localStorage.getItem('bjuHistory')) || [];
    },
    simulateCameraError: () => {
        handleCameraError(new Error('Test camera error'));
    }
};

console.log('Скрипт app.js загружен');