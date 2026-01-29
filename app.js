// ===== БАЗОВЫЕ ПЕРЕМЕННЫЕ =====
let currentStream = null;
let currentProduct = null;
let isScanning = false;
let scanInterval = null;

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Приложение загружено');
    
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
        
        // Запрашиваем доступ к камере (упрощенные настройки для лучшей совместимости)
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment'
            },
            audio: false
        });
        
        console.log('✅ Доступ к камере получен');
        currentStream = stream;
        isScanning = true;
        
        // Обновляем UI кнопок
        document.getElementById('startScanner').classList.add('hidden');
        document.getElementById('stopScanner').classList.remove('hidden');
        
        // Создаём интерфейс камеры
        createCameraUI(stream);
        
        // Запускаем сканирование
        startBarcodeScanning();
        
        showNotification('Камера активирована', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка камеры:', error);
        
        let message = 'Не удалось получить доступ к камере. ';
        if (error.name === 'NotAllowedError') {
            message += 'Вы отклонили запрос на доступ.';
        } else if (error.name === 'NotFoundError') {
            message += 'Камера не найдена.';
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
    
    // Настраиваем видео
    const video = document.getElementById('cameraPreview');
    video.srcObject = stream;
    
    // Важно для iOS
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    
    video.onloadedmetadata = () => {
        video.play().catch(e => console.log('Ошибка воспроизведения:', e));
    };
    
    // Обработчик переключения камеры
    const switchBtn = document.getElementById('switchCameraBtn');
    if (switchBtn) {
        switchBtn.addEventListener('click', () => switchCamera(stream, video));
    }
}

// ===== СКАНИРОВАНИЕ ШТРИХ-КОДОВ =====
function startBarcodeScanning() {
    console.log('🔍 Запуск сканирования штрих-кодов...');
    
    // Проверяем, загружена ли библиотека ZXing
    if (typeof ZXing === 'undefined') {
        console.error('ZXing не загружен');
        showNotification('Библиотека сканирования не загружена', 'error');
        return;
    }
    
    const video = document.getElementById('cameraPreview');
    if (!video) return;
    
    // Создаём экземпляр сканера
    const codeReader = new ZXing.BrowserMultiFormatReader();
    
    console.log('✅ Сканер инициализирован');
    
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
    
    codeReader.hints = new Map([
        [ZXing.DecodeHintType.POSSIBLE_FORMATS, formats],
        [ZXing.DecodeHintType.TRY_HARDER, true]
    ]);
    
    // Создаём canvas для захвата кадра
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    let lastScanTime = 0;
    const SCAN_INTERVAL = 500; // Сканировать каждые 500ms
    
    // Функция сканирования кадра
    function scanFrame() {
        if (!isScanning || !video.videoWidth) {
            return;
        }
        
        const now = Date.now();
        if (now - lastScanTime < SCAN_INTERVAL) {
            // Слишком часто сканируем, пропускаем кадр
            requestAnimationFrame(scanFrame);
            return;
        }
        
        lastScanTime = now;
        
        try {
            // Устанавливаем размер canvas как у видео
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Рисуем текущий кадр видео на canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Пытаемся распознать штрих-код
            codeReader.decodeFromCanvas(canvas)
                .then(result => {
                    console.log('✅ Найден штрих-код:', result.text, 'Формат:', result.format);
                    
                    // Останавливаем сканирование
                    stopCamera();
                    
                    // Обрабатываем результат
                    handleScanResult(result.text, result.format);
                    
                    // Воспроизводим звук успеха
                    playSuccessSound();
                    
                    // Показываем уведомление
                    showNotification('Штрих-код распознан!', 'success');
                })
                .catch(error => {
                    // Это нормально - штрих-код не найден в этом кадре
                    // Продолжаем сканирование
                    if (isScanning) {
                        requestAnimationFrame(scanFrame);
                    }
                });
                
        } catch (error) {
            console.error('Ошибка при сканировании:', error);
            if (isScanning) {
                setTimeout(scanFrame, 100);
            }
        }
    }
    
    // Запускаем сканирование
    scanFrame();
    
    console.log('🎬 Сканирование запущено');
}

// Альтернативный метод сканирования через BarcodeDetector API (если доступен)
function startBarcodeDetectorScanning() {
    const video = document.getElementById('cameraPreview');
    if (!video) return;
    
    // Проверяем поддержку BarcodeDetector API
    if ('BarcodeDetector' in window) {
        console.log('📱 Используем BarcodeDetector API');
        
        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'datamatrix']
        });
        
        let isProcessing = false;
        
        async function detectBarcode() {
            if (!isScanning || isProcessing || !video.videoWidth) return;
            
            isProcessing = true;
            
            try {
                const barcodes = await barcodeDetector.detect(video);
                
                if (barcodes.length > 0) {
                    const barcode = barcodes[0];
                    console.log('✅ BarcodeDetector нашел код:', barcode.rawValue);
                    
                    stopCamera();
                    handleScanResult(barcode.rawValue, barcode.format);
                    playSuccessSound();
                    showNotification('Штрих-код распознан!', 'success');
                    return;
                }
            } catch (error) {
                console.log('BarcodeDetector ошибка:', error);
            } finally {
                isProcessing = false;
            }
            
            if (isScanning) {
                requestAnimationFrame(detectBarcode);
            }
        }
        
        detectBarcode();
    } else {
        console.log('⚠️ BarcodeDetector не поддерживается, используем ZXing');
        startBarcodeScanning();
    }
}

// ===== ОБРАБОТКА РЕЗУЛЬТАТОВ СКАНИРОВАНИЯ =====
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
            // Это штрих-код продукта
            searchProduct(code);
            break;
            
        case 'datamatrix':
            // Честный знак (DataMatrix)
            processDataMatrixCode(code);
            break;
            
        case 'qr_code':
            // QR-код
            if (code.startsWith('http://') || code.startsWith('https://')) {
                showNotification(`QR-код содержит ссылку: ${code.substring(0, 30)}...`, 'info');
                // Можно открыть ссылку в новом окне
                // window.open(code, '_blank');
            } else {
                showNotification(`QR-код: ${code.substring(0, 50)}...`, 'info');
            }
            break;
            
        default:
            // Неизвестный формат, пробуем как штрих-код
            if (code.length >= 8 && /^\d+$/.test(code)) {
                searchProduct(code);
            } else {
                showNotification(`Распознан код: ${code}`, 'info');
            }
    }
}

function detectCodeType(code, format) {
    // Если формат передан, используем его
    if (format) {
        return format.toString().toLowerCase();
    }
    
    // Определяем по длине и формату
    if (code.length === 13 && /^\d+$/.test(code)) {
        return 'ean13';
    } else if (code.length === 8 && /^\d+$/.test(code)) {
        return 'ean8';
    } else if (code.length === 12 && /^\d+$/.test(code)) {
        return 'upca';
    } else if (code.length === 7 && /^\d+$/.test(code)) {
        return 'upce';
    } else if (/^01\d{14}21[A-Za-z0-9]{13}$/.test(code)) {
        return 'datamatrix'; // Честный знак
    } else if (code.startsWith('http')) {
        return 'qr_code';
    }
    
    return 'unknown';
}

function processDataMatrixCode(code) {
    console.log('🏷️ Обработка DataMatrix кода (Честный знак):', code);
    
    // Пробуем извлечь GTIN из кода маркировки
    const gtinMatch = code.match(/01(\d{14})/);
    if (gtinMatch) {
        const gtin = gtinMatch[1];
        console.log('📦 Извлечен GTIN:', gtin);
        
        // Показываем информацию о маркировке
        showNotification('Распознан код маркировки "Честный знак"', 'success');
        
        // Ищем продукт по GTIN
        setTimeout(() => {
            searchProduct(gtin);
        }, 1000);
    } else {
        showNotification('Распознан DataMatrix код', 'info');
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
    
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
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
        
        // Тестовые данные для демонстрации
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
            },
            '5901234123457': {
                name: 'Молочный шоколад',
                brand: 'Пример бренда',
                calories: '550',
                protein: '8',
                fat: '32',
                carbs: '55',
                weight: '100g',
                source: 'Демо-данные'
            }
        };
        
        // Сначала проверяем тестовые данные
        if (testProducts[barcode]) {
            setTimeout(() => {
                displayProduct(testProducts[barcode], barcode);
                showLoading(false);
            }, 500);
            return;
        }
        
        // Пробуем Open Food Facts API
        showNotification('Ищем в базе данных...', 'info');
        
        try {
            const response = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
                {
                    headers: {
                        'User-Agent': 'NutritionScanner/1.0'
                    },
                    timeout: 10000
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.status === 1 && data.product) {
                    const product = data.product;
                    const nutrition = product.nutriments || {};
                    
                    displayProduct({
                        name: product.product_name || 
                              product.product_name_ru || 
                              product.product_name_en || 
                              'Неизвестный продукт',
                        brand: product.brands || 
                              product.brand_owner || 
                              'Не указано',
                        calories: nutrition['energy-kcal'] || 
                                 nutrition['energy-kcal_100g'] || 
                                 nutrition.energy || 
                                 '0',
                        protein: nutrition.proteins || 
                                nutrition['proteins_100g'] || 
                                '0',
                        fat: nutrition.fat || 
                             nutrition['fat_100g'] || 
                             '0',
                        carbs: nutrition.carbohydrates || 
                               nutrition['carbohydrates_100g'] || 
                               '0',
                        weight: product.quantity || 
                               (product.product_quantity ? `${product.product_quantity}g` : 'Не указано'),
                        source: 'Open Food Facts'
                    }, barcode);
                    
                    showLoading(false);
                    return;
                }
            }
        } catch (apiError) {
            console.log('Open Food Facts API error:', apiError);
        }
        
        // Если продукт не найден
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
        
        showNotification('Продукт не найден в базе', 'warning');
        
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
    
    // Ограничиваем историю 50 записями
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
        // Создаём простой звуковой сигнал
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
    // Создаём элемент уведомления, если его нет
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification hidden';
        document.body.appendChild(notification);
    }
    
    // Устанавливаем цвет в зависимости от типа
    const colors = {
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    notification.textContent = message;
    notification.style.background = colors[type] || colors.info;
    notification.classList.remove('hidden');
    
    // Автоматически скрываем через 3 секунды
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

// Тестовые функции для отладки
window.testScanner = function(barcode = '3017620422003') {
    console.log('🧪 Тестовое сканирование:', barcode);
    handleScanResult(barcode, 'ean13');
};

window.clearAllData = function() {
    localStorage.clear();
    location.reload();
};