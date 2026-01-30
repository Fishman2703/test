// ===== БАЗОВЫЕ ПЕРЕМЕННЫЕ =====
let currentStream = null;
let currentProduct = null;
let isScanning = false;
let scanTimeout = null;
let currentScanner = null;
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
let isAndroid = /Android/.test(navigator.userAgent);

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Приложение загружено');
    console.log(`📱 Платформа: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}`);
    
    // Инициализация темы
    initTheme();
    
    // Загрузка истории
    loadHistory();
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    // Автофокус на поле ввода
    document.getElementById('manualBarcode')?.focus();
    
    console.log('✅ Приложение готово');
});

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    console.log('🔄 Настройка обработчиков...');
    
    // Кнопка запуска сканера
    const startBtn = document.getElementById('startScanner');
    if (startBtn) {
        startBtn.addEventListener('click', startCamera);
        console.log('✅ Кнопка "startScanner" настроена');
    }
    
    // Кнопка остановки сканера
    const stopBtn = document.getElementById('stopScanner');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopCamera);
        console.log('✅ Кнопка "stopScanner" настроена');
    }
    
    // Кнопка ручного поиска
    const checkBtn = document.getElementById('checkManual');
    if (checkBtn) {
        checkBtn.addEventListener('click', handleManualSearch);
        console.log('✅ Кнопка "checkManual" настроена');
    }
    
    // Кнопка сохранения в историю
    const saveBtn = document.getElementById('saveProduct');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveToHistory);
        console.log('✅ Кнопка "saveProduct" настроена');
    }
    
    // Кнопка очистки истории
    const clearBtn = document.getElementById('clearHistory');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearHistory);
        console.log('✅ Кнопка "clearHistory" настроена');
    }
    
    // Кнопка переключения темы
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
        console.log('✅ Кнопка "themeToggle" настроена');
    }
    
    // Кнопка закрытия
    const closeBtn = document.getElementById('closeApp');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (window.Telegram?.WebApp?.close) {
                window.Telegram.WebApp.close();
            }
        });
        console.log('✅ Кнопка "closeApp" настроена');
    }
    
    // Ручной ввод по Enter
    const manualInput = document.getElementById('manualBarcode');
    if (manualInput) {
        manualInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleManualSearch();
            }
        });
        console.log('✅ Поле ввода настроено');
    }
    
    // Тестовые штрих-коды
    document.querySelectorAll('.code-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const barcode = this.dataset.code;
            if (manualInput) {
                manualInput.value = barcode;
                handleManualSearch();
            }
        });
    });
    
    console.log('🎯 Все обработчики настроены');
}

// ===== ТЕМА =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    showNotification(`Тема: ${newTheme === 'dark' ? 'тёмная' : 'светлая'}`, 'info');
}

// ===== КАМЕРА И СКАНИРОВАНИЕ =====
async function startCamera() {
    console.log('📷 Запуск камеры...');
    
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    // Проверяем поддержку камеры
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Ваш браузер не поддерживает камеру', 'error');
        return;
    }
    
    try {
        // Показываем сообщение о запросе доступа
        scannerContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <div class="loading" style="margin: 0 auto 20px;"></div>
                <p>Запрашиваем доступ к камере...</p>
                <p style="font-size: 14px; color: var(--text-muted); margin-top: 10px;">
                    Разрешите доступ к камере во всплывающем окне
                </p>
            </div>
        `;
        
        // Разные настройки для разных платформ
        let constraints;
        
        if (isAndroid) {
            // Для Android - упрощенные настройки
            constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 }
                },
                audio: false
            };
            console.log('🤖 Android: используем упрощенные настройки');
        } else if (isIOS) {
            // Для iOS
            constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { min: 640, ideal: 1280 },
                    height: { min: 480, ideal: 720 }
                },
                audio: false
            };
            console.log('🍎 iOS: используем специфичные настройки');
        } else {
            // Для десктопа
            constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
        }
        
        // Запрашиваем доступ к камере
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('✅ Доступ к камере получен');
        currentStream = stream;
        isScanning = true;
        
        // Обновляем UI кнопок
        document.getElementById('startScanner').classList.add('hidden');
        document.getElementById('stopScanner').classList.remove('hidden');
        
        // Создаём интерфейс камеры для конкретной платформы
        createCameraUI(stream);
        
        // Запускаем сканирование с учетом платформы
        startPlatformScanning();
        
        showNotification('Камера активирована', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка камеры:', error.name, error.message);
        
        let message = 'Не удалось получить доступ к камере. ';
        
        if (error.name === 'NotAllowedError') {
            message += 'Вы отклонили запрос на доступ к камере. ';
            if (isAndroid) {
                message += 'На Android: зайдите в настройки приложения и разрешите доступ к камере.';
            } else if (isIOS) {
                message += 'На iOS: зайдите в Настройки > Safari > Камера и разрешите доступ.';
            }
        } else if (error.name === 'NotFoundError') {
            message += 'Камера не найдена.';
        } else if (error.name === 'NotSupportedError') {
            message += 'Ваш браузер не поддерживает доступ к камере.';
        } else if (error.name === 'NotReadableError') {
            message += 'Камера уже используется другим приложением.';
        } else if (error.name === 'OverconstrainedError') {
            message += 'Не удалось найти камеру с требуемыми параметрами.';
        } else {
            message += error.message;
        }
        
        showNotification(message, 'error');
        
        // Показываем альтернативные варианты
        showAlternativeOptions();
    }
}

function createCameraUI(stream) {
    const scannerContainer = document.getElementById('qr-reader');
    
    if (isAndroid) {
        // Интерфейс для Android
        scannerContainer.innerHTML = `
            <div class="camera-container" style="position: relative;">
                <video id="cameraPreview" autoplay playsinline muted 
                       style="width: 100%; height: 400px; object-fit: cover; border-radius: var(--radius);"></video>
                <div class="scan-overlay">
                    <div class="scan-line"></div>
                </div>
                <div class="scan-hint">
                    Наведите на штрих-код | Android
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <button id="switchCameraBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); margin: 5px;">
                    <i class="fas fa-sync-alt"></i> Переключить камеру
                </button>
                <button id="toggleTorchBtn" class="btn" style="background: var(--warning-color); color: white; margin: 5px;">
                    <i class="fas fa-lightbulb"></i> Фонарик
                </button>
            </div>
        `;
    } else {
        // Интерфейс для iOS и других
        scannerContainer.innerHTML = `
            <div class="camera-container" style="position: relative;">
                <video id="cameraPreview" autoplay playsinline muted 
                       style="width: 100%; height: 400px; object-fit: cover; border-radius: var(--radius);"></video>
                <div class="scan-overlay">
                    <div class="scan-line"></div>
                </div>
                <div class="scan-hint">
                    Наведите камеру на штрих-код
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <button id="switchCameraBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); margin: 5px;">
                    <i class="fas fa-sync-alt"></i> Переключить камеру
                </button>
            </div>
        `;
    }
    
    // Настраиваем видео
    const video = document.getElementById('cameraPreview');
    video.srcObject = stream;
    
    // Важные атрибуты для мобильных устройств
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    
    video.onloadedmetadata = () => {
        video.play().catch(e => {
            console.log('Ошибка воспроизведения:', e);
            // Пробуем еще раз
            setTimeout(() => video.play(), 100);
        });
    };
    
    // Обработчик переключения камеры
    const switchBtn = document.getElementById('switchCameraBtn');
    if (switchBtn) {
        switchBtn.addEventListener('click', () => switchCamera(stream, video));
    }
    
    // Кнопка фонарика только для Android
    if (isAndroid) {
        const torchBtn = document.getElementById('toggleTorchBtn');
        if (torchBtn) {
            torchBtn.addEventListener('click', () => toggleTorch(stream));
        }
    }
}

// ===== СКАНИРОВАНИЕ ДЛЯ РАЗНЫХ ПЛАТФОРМ =====
function startPlatformScanning() {
    console.log(`🔍 Запуск сканирования для ${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop'}...`);
    
    // Сначала пробуем BarcodeDetector API (лучше для Android)
    if (typeof BarcodeDetector !== 'undefined' && isAndroid) {
        console.log('📱 Android: используем BarcodeDetector API');
        startBarcodeDetectorScanning();
    } else {
        // Используем ZXing для iOS и других платформ
        console.log('📚 Используем ZXing библиотеку');
        startZXingScanning();
    }
}

// Сканирование через BarcodeDetector API (лучше для Android)
function startBarcodeDetectorScanning() {
    const video = document.getElementById('cameraPreview');
    if (!video) return;
    
    try {
        // Создаем детектор для всех форматов
        const barcodeDetector = new BarcodeDetector({
            formats: [
                'ean_13', 'ean_8', 'upc_a', 'upc_e',
                'code_128', 'code_39', 'code_93',
                'codabar', 'itf', 'qr_code', 'data_matrix',
                'aztec', 'pdf417'
            ]
        });
        
        console.log('✅ BarcodeDetector создан');
        
        let isProcessing = false;
        
        async function detectFrame() {
            if (!isScanning || isProcessing || !video.videoWidth) return;
            
            isProcessing = true;
            
            try {
                const barcodes = await barcodeDetector.detect(video);
                
                if (barcodes.length > 0) {
                    const barcode = barcodes[0];
                    console.log('✅ BarcodeDetector нашел:', barcode.rawValue, 'Формат:', barcode.format);
                    
                    stopCamera();
                    handleScanResult(barcode.rawValue, barcode.format);
                    playSuccessSound();
                    return;
                }
            } catch (error) {
                console.log('BarcodeDetector ошибка:', error);
                // Переключаемся на ZXing при ошибке
                if (isScanning) {
                    console.log('🔄 Переключаемся на ZXing...');
                    startZXingScanning();
                    return;
                }
            } finally {
                isProcessing = false;
            }
            
            if (isScanning) {
                requestAnimationFrame(detectFrame);
            }
        }
        
        detectFrame();
        
    } catch (error) {
        console.error('❌ Ошибка BarcodeDetector:', error);
        // Возвращаемся к ZXing
        startZXingScanning();
    }
}

// Сканирование через ZXing (универсальное)
function startZXingScanning() {
    const video = document.getElementById('cameraPreview');
    if (!video) return;
    
    // Проверяем, загружена ли библиотека ZXing
    if (typeof ZXing === 'undefined') {
        console.error('❌ ZXing не загружен');
        showNotification('Ошибка загрузки сканера', 'error');
        return;
    }
    
    try {
        // Создаём экземпляр сканера
        currentScanner = new ZXing.BrowserMultiFormatReader();
        
        // Настраиваем форматы для сканирования
        const formats = [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODE_128,
            ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.QR_CODE,
            ZXing.BarcodeFormat.DATA_MATRIX
        ];
        
        // Добавляем подсказки для лучшего распознавания
        if (currentScanner.hints) {
            currentScanner.hints.set(
                ZXing.DecodeHintType.POSSIBLE_FORMATS,
                formats
            );
            currentScanner.hints.set(
                ZXing.DecodeHintType.TRY_HARDER,
                true
            );
        }
        
        console.log('✅ ZXing сканер создан');
        
        // Для Android используем более частый опрос
        const scanDelay = isAndroid ? 300 : 500;
        
        // Функция сканирования
        function scanWithZXing() {
            if (!isScanning || !video.videoWidth) return;
            
            try {
                // Создаем canvas для текущего кадра
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                // Устанавливаем размер canvas
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Рисуем кадр видео
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Пытаемся распознать штрих-код
                currentScanner.decodeFromCanvas(canvas)
                    .then(result => {
                        console.log('✅ ZXing нашел:', result.text, 'Формат:', result.format);
                        
                        stopCamera();
                        handleScanResult(result.text, result.format);
                        playSuccessSound();
                    })
                    .catch(error => {
                        // Штрих-код не найден - это нормально
                        // Продолжаем сканирование
                        if (isScanning) {
                            setTimeout(scanWithZXing, scanDelay);
                        }
                    });
                    
            } catch (error) {
                console.log('Ошибка сканирования ZXing:', error);
                if (isScanning) {
                    setTimeout(scanWithZXing, scanDelay);
                }
            }
        }
        
        // Запускаем сканирование
        scanWithZXing();
        
    } catch (error) {
        console.error('❌ Ошибка инициализации ZXing:', error);
        showNotification('Ошибка сканирования', 'error');
    }
}

// ===== ФОНАРИК ДЛЯ ANDROID =====
async function toggleTorch(stream) {
    if (!stream) return;
    
    try {
        const track = stream.getVideoTracks()[0];
        
        // Проверяем поддержку фонарика
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        
        if ('torch' in capabilities) {
            const torchBtn = document.getElementById('toggleTorchBtn');
            const currentTorch = track.getConstraints().torch || false;
            
            await track.applyConstraints({
                advanced: [{ torch: !currentTorch }]
            });
            
            if (torchBtn) {
                if (!currentTorch) {
                    torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Выкл.';
                    torchBtn.style.background = 'var(--danger-color)';
                    showNotification('Фонарик включен', 'success');
                } else {
                    torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Вкл.';
                    torchBtn.style.background = 'var(--warning-color)';
                    showNotification('Фонарик выключен', 'info');
                }
            }
        } else {
            showNotification('Фонарик не поддерживается на этом устройстве', 'warning');
        }
        
    } catch (error) {
        console.error('Ошибка фонарика:', error);
        showNotification('Не удалось включить фонарик', 'error');
    }
}

async function switchCamera(oldStream, video) {
    try {
        // Останавливаем старый поток
        oldStream.getTracks().forEach(track => track.stop());
        
        // Определяем текущую камеру
        const track = oldStream.getVideoTracks()[0];
        const settings = track.getSettings();
        const currentMode = settings.facingMode || 'environment';
        const newMode = currentMode === 'environment' ? 'user' : 'environment';
        
        // Запрашиваем новую камеру
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: newMode
            }
        });
        
        currentStream = newStream;
        video.srcObject = newStream;
        
        showNotification(`Камера: ${newMode === 'environment' ? 'Задняя' : 'Фронтальная'}`, 'info');
        
    } catch (error) {
        console.error('Ошибка переключения камеры:', error);
        showNotification('Не удалось переключить камеру', 'error');
    }
}

function stopCamera() {
    console.log('⏹️ Остановка камеры...');
    
    isScanning = false;
    
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    // Останавливаем сканер ZXing если активен
    if (currentScanner && currentScanner.reset) {
        try {
            currentScanner.reset();
        } catch (e) {
            console.log('Ошибка при остановке сканера:', e);
        }
        currentScanner = null;
    }
    
    // Обновляем UI
    document.getElementById('startScanner')?.classList.remove('hidden');
    document.getElementById('stopScanner')?.classList.add('hidden');
    
    // Восстанавливаем плейсхолдер
    const scannerContainer = document.getElementById('qr-reader');
    if (scannerContainer) {
        scannerContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <i class="fas fa-camera" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>Сканер отключен</p>
                <p style="font-size: 14px; margin-top: 10px;">
                    Нажмите "Включить сканер" для сканирования
                </p>
            </div>
        `;
    }
    
    showNotification('Сканирование остановлено', 'info');
}

// ===== ОБРАБОТКА РЕЗУЛЬТАТОВ =====
function handleScanResult(code, format) {
    console.log('📊 Обработка результата:', code, 'Формат:', format);
    
    // Определяем тип кода
    const codeType = detectCodeType(code, format);
    console.log('📋 Тип кода:', codeType);
    
    switch(codeType) {
        case 'ean13':
        case 'ean8':
        case 'upca':
        case 'upce':
        case 'code128':
        case 'code39':
            // Штрих-код продукта
            searchProduct(code);
            break;
            
        case 'datamatrix':
        case 'data_matrix':
            // Честный знак
            processDataMatrixCode(code);
            break;
            
        case 'qr_code':
            // QR-код
            if (code.startsWith('http')) {
                showNotification(`QR-код: ${code.substring(0, 30)}...`, 'info');
            } else {
                showNotification(`QR-код: ${code.substring(0, 50)}...`, 'info');
            }
            break;
            
        default:
            // Пробуем как штрих-код
            if (code.length >= 8 && /^\d+$/.test(code)) {
                searchProduct(code);
            } else {
                showNotification(`Код: ${code.substring(0, 30)}...`, 'info');
            }
    }
}

function detectCodeType(code, format) {
    if (format) {
        return format.toString().toLowerCase();
    }
    
    if (code.length === 13 && /^\d+$/.test(code)) {
        return 'ean13';
    } else if (code.length === 8 && /^\d+$/.test(code)) {
        return 'ean8';
    } else if (code.length === 12 && /^\d+$/.test(code)) {
        return 'upca';
    } else if (/^01\d{14}21[A-Za-z0-9]{13}$/.test(code)) {
        return 'datamatrix';
    } else if (code.startsWith('http')) {
        return 'qr_code';
    }
    
    return 'unknown';
}

function processDataMatrixCode(code) {
    console.log('🏷️ Обработка DataMatrix кода:', code);
    
    // Извлекаем GTIN из кода маркировки
    const gtinMatch = code.match(/01(\d{14})/);
    if (gtinMatch) {
        const gtin = gtinMatch[1];
        showNotification('Распознан код маркировки', 'success');
        
        // Ищем продукт по GTIN
        setTimeout(() => {
            searchProduct(gtin);
        }, 1000);
    } else {
        showNotification('Распознан DataMatrix код', 'info');
    }
}

// ===== ПОИСК ПРОДУКТА =====
function handleManualSearch() {
    const input = document.getElementById('manualBarcode');
    const barcode = input.value.trim();
    
    if (!barcode) {
        showNotification('Введите штрих-код', 'warning');
        input.focus();
        return;
    }
    
    if (barcode.length < 8) {
        showNotification('Штрих-код должен содержать минимум 8 цифр', 'warning');
        return;
    }
    
    searchProduct(barcode);
}

async function searchProduct(barcode) {
    try {
        showLoading(true);
        console.log(`🔍 Поиск продукта: ${barcode}`);
        
        // Тестовые данные
        const testProducts = {
            '3017620422003': {
                name: 'Nutella',
                brand: 'Ferrero',
                calories: '530',
                protein: '6.3',
                fat: '30.9',
                carbs: '57.5',
                weight: '400g',
                source: 'Демо-данные'
            },
            '7622210288257': {
                name: 'Oreo Original',
                brand: 'Mondelez',
                calories: '474',
                protein: '5.2',
                fat: '20',
                carbs: '69',
                weight: '154g',
                source: 'Демо-данные'
            },
            '4014400900508': {
                name: 'Red Bull Energy Drink',
                brand: 'Red Bull',
                calories: '45',
                protein: '0',
                fat: '0',
                carbs: '11',
                weight: '250ml',
                source: 'Демо-данные'
            },
            '5449000000996': {
                name: 'Coca-Cola Classic',
                brand: 'Coca-Cola',
                calories: '42',
                protein: '0',
                fat: '0',
                carbs: '10.6',
                weight: '330ml',
                source: 'Демо-данные'
            }
        };
        
        // Используем тестовые данные
        if (testProducts[barcode]) {
            setTimeout(() => {
                displayProduct(testProducts[barcode], barcode);
                showLoading(false);
            }, 500);
            return;
        }
        
        // Пробуем Open Food Facts API
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.status === 1 && data.product) {
                    const product = data.product;
                    const nutrition = product.nutriments || {};
                    
                    displayProduct({
                        name: product.product_name || 'Неизвестный продукт',
                        brand: product.brands || 'Не указано',
                        calories: nutrition['energy-kcal'] || '0',
                        protein: nutrition.proteins || '0',
                        fat: nutrition.fat || '0',
                        carbs: nutrition.carbohydrates || '0',
                        weight: product.quantity || 'Не указано',
                        source: 'Open Food Facts'
                    }, barcode);
                    
                    showLoading(false);
                    return;
                }
            }
        } catch (apiError) {
            console.log('API error:', apiError);
        }
        
        // Продукт не найден
        displayProduct({
            name: `Продукт ${barcode}`,
            brand: 'Неизвестный бренд',
            calories: '0',
            protein: '0',
            fat: '0',
            carbs: '0',
            weight: 'Не указано',
            source: 'Не найдено'
        }, barcode);
        
    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        showNotification('Ошибка при поиске продукта', 'error');
    } finally {
        showLoading(false);
    }
}

function displayProduct(product, barcode) {
    const scanDate = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    currentProduct = {
        ...product,
        barcode,
        date: new Date().toISOString()
    };
    
    // Обновляем UI
    const fields = {
        'productName': product.name,
        'calories': product.calories,
        'protein': product.protein,
        'fat': product.fat,
        'carbs': product.carbs,
        'brand': product.brand,
        'weight': product.weight,
        'barcode': barcode,
        'scanDate': scanDate
    };
    
    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    // Источник данных
    const sourceElement = document.getElementById('productStatus');
    if (sourceElement) {
        let statusHtml = '';
        if (product.source === 'Демо-данные') {
            statusHtml = '<span style="color: var(--warning-color);"><i class="fas fa-flask"></i> Демо-данные</span>';
        } else if (product.source === 'Не найдено') {
            statusHtml = '<span style="color: var(--warning-color);"><i class="fas fa-exclamation-triangle"></i> Не найдено</span>';
        } else {
            statusHtml = `<span style="color: var(--info-color);"><i class="fas fa-database"></i> ${product.source}</span>`;
        }
        sourceElement.innerHTML = statusHtml;
    }
    
    // Показываем результат
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        resultDiv.classList.remove('hidden');
        
        setTimeout(() => {
            resultDiv.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 300);
    }
    
    showNotification('Продукт найден!', 'success');
    playSuccessSound();
}

// ===== ИСТОРИЯ =====
function loadHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>История сканирований пуста</p>
            </div>
        `;
        return;
    }
    
    // Показываем последние 10 записей
    history.slice(-10).reverse().forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div style="flex: 1;">
                <div class="history-name">${item.name || 'Неизвестный продукт'}</div>
                <div class="history-details">
                    <span>${item.brand || 'Неизвестный бренд'}</span>
                    <span style="margin-left: 10px; font-size: 12px; color: var(--text-muted);">
                        ${item.date ? new Date(item.date).toLocaleDateString('ru-RU') : ''}
                    </span>
                </div>
            </div>
            <div class="history-nutrition">
                <div class="history-calories">${item.calories || '0'} ккал</div>
                <div class="history-macros">${item.protein || '0'}Б/${item.fat || '0'}Ж/${item.carbs || '0'}У</div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            if (item.barcode) {
                searchProduct(item.barcode);
            }
        });
        
        historyList.appendChild(div);
    });
}

function saveToHistory() {
    if (!currentProduct) {
        showNotification('Сначала отсканируйте продукт!', 'warning');
        return;
    }
    
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    const existingIndex = history.findIndex(item => item.barcode === currentProduct.barcode);
    
    if (existingIndex !== -1) {
        history[existingIndex] = currentProduct;
        showNotification('Запись обновлена', 'success');
    } else {
        history.push(currentProduct);
        showNotification('Сохранено в историю', 'success');
    }
    
    const limitedHistory = history.slice(-50);
    localStorage.setItem('bjuHistory', JSON.stringify(limitedHistory));
    
    loadHistory();
}

function clearHistory() {
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    if (history.length === 0) {
        showNotification('История уже пуста', 'info');
        return;
    }
    
    if (confirm(`Очистить всю историю (${history.length} записей)?`)) {
        localStorage.removeItem('bjuHistory');
        loadHistory();
        showNotification('История очищена', 'success');
    }
}

// ===== УТИЛИТЫ =====
function showAlternativeOptions() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div style="text-align: center; padding: 30px 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 20px;">
                <i class="fas fa-camera-slash"></i> Камера недоступна
            </h3>
            
            <p style="color: var(--text-secondary); margin-bottom: 25px;">
                Используйте альтернативные способы:
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 10px; max-width: 300px; margin: 0 auto;">
                <button onclick="document.getElementById('manualBarcode').focus()" class="btn btn-primary">
                    <i class="fas fa-keyboard"></i> Ввести код вручную
                </button>
            </div>
        </div>
    `;
}

function showLoading(show) {
    const buttons = ['startScanner', 'checkManual'];
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (show) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }
    });
}

function playSuccessSound() {
    try {
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

function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification hidden';
        document.body.appendChild(notification);
    }
    
    const colors = {
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    notification.textContent = message;
    notification.style.background = colors[type] || colors.info;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
// Прогресс-бар при прокрутке
window.addEventListener('scroll', function() {
    const progressFill = document.getElementById('progressFill');
    if (!progressFill) return;
    
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = Math.min((winScroll / height) * 100, 100);
    progressFill.style.width = scrolled + "%";
});

// Приветственное сообщение
setTimeout(() => {
    showNotification('Сканер БЖУ готов к работе!', 'success');
}, 1000);

// Функции для отладки
window.testBarcode = function(code = '3017620422003') {
    console.log('🧪 Тестируем штрих-код:', code);
    handleScanResult(code, 'ean13');
};

window.getDeviceInfo = function() {
    return {
        platform: isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop',
        userAgent: navigator.userAgent,
        supportsBarcodeDetector: typeof BarcodeDetector !== 'undefined',
        supportsZXing: typeof ZXing !== 'undefined',
        supportsCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };
};