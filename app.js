// ===== БАЗОВЫЕ ПЕРЕМЕННЫЕ =====
let currentStream = null;
let currentProduct = null;
let isScanning = false;
let scanInterval = null;

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Приложение загружено для Android');
    
    // Простая инициализация
    initSimpleTheme();
    loadHistory();
    setupSimpleEventListeners();
    
    // Фокус на поле ввода
    setTimeout(() => {
        const input = document.getElementById('manualBarcode');
        if (input) input.focus();
    }, 500);
    
    // Показываем уведомление
    setTimeout(() => {
        showSimpleNotification('Сканер БЖУ готов! Используйте ручной ввод или камеру.', 'info');
    }, 1000);
});

// ===== ПРОСТАЯ ТЕМА =====
function initSimpleTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    showSimpleNotification(`Тема: ${newTheme === 'dark' ? 'тёмная' : 'светлая'}`, 'info');
}

// ===== ПРОСТЫЕ ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupSimpleEventListeners() {
    console.log('🔄 Настройка простых обработчиков...');
    
    // Все кнопки
    const buttons = {
        'startScanner': startSimpleCamera,
        'stopScanner': stopSimpleCamera,
        'checkManual': handleSimpleManualSearch,
        'saveProduct': saveToHistory,
        'clearHistory': clearHistory,
        'themeToggle': toggleTheme,
        'closeApp': function() {
            if (window.Telegram?.WebApp?.close) {
                window.Telegram.WebApp.close();
            }
        }
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
            console.log(`✅ Кнопка "${id}" настроена`);
        }
    });
    
    // Ручной ввод по Enter
    const manualInput = document.getElementById('manualBarcode');
    if (manualInput) {
        manualInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSimpleManualSearch();
            }
        });
    }
    
    // Тестовые коды
    document.querySelectorAll('.code-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const barcode = this.dataset.code;
            if (manualInput) {
                manualInput.value = barcode;
                handleSimpleManualSearch();
            }
        });
    });
    
    console.log('🎯 Все обработчики настроены');
}

// ===== ПРОСТОЙ СКАНЕР ДЛЯ ANDROID =====
async function startSimpleCamera() {
    console.log('📷 Пытаемся запустить камеру на Android...');
    
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    // Показываем простой индикатор
    scannerContainer.innerHTML = `
        <div style="text-align: center; padding: 30px 20px;">
            <div class="loading" style="margin: 0 auto 20px; width: 40px; height: 40px;"></div>
            <p style="color: var(--text-primary); margin-bottom: 10px;">Запуск камеры...</p>
            <p style="color: var(--text-secondary); font-size: 14px;">
                На Android может потребоваться разрешение
            </p>
        </div>
    `;
    
    try {
        // ОЧЕНЬ ПРОСТЫЕ настройки для Android
        const constraints = {
            video: {
                facingMode: 'environment' // Просто задняя камера
            },
            audio: false
        };
        
        console.log('📱 Запрашиваем камеру с настройками:', constraints);
        
        // Запрашиваем камеру
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('✅ Камера получена!');
        currentStream = stream;
        isScanning = true;
        
        // Обновляем UI
        document.getElementById('startScanner')?.classList.add('hidden');
        document.getElementById('stopScanner')?.classList.remove('hidden');
        
        // Создаём ОЧЕНЬ ПРОСТОЙ интерфейс камеры
        createSimpleCameraUI(stream);
        
        // Пробуем разные методы сканирования
        tryAllScanningMethods();
        
        showSimpleNotification('Камера запущена! Наведите на штрих-код', 'success');
        
    } catch (error) {
        console.error('❌ Критическая ошибка камеры:', error.name, error.message);
        
        // Показываем понятную ошибку для Android
        let message = 'Не удалось запустить камеру. ';
        
        if (error.name === 'NotAllowedError') {
            message += 'Разрешите доступ к камере в настройках браузера.';
        } else if (error.name === 'NotFoundError') {
            message += 'Камера не найдена.';
        } else if (error.name === 'NotSupportedError') {
            message += 'Ваш браузер не поддерживает камеру.';
        } else {
            message += 'Попробуйте использовать ручной ввод.';
        }
        
        showSimpleNotification(message, 'error');
        
        // Показываем альтернативы
        showAndroidAlternatives();
    }
}

function createSimpleCameraUI(stream) {
    const scannerContainer = document.getElementById('qr-reader');
    
    // МИНИМАЛЬНЫЙ интерфейс для Android
    scannerContainer.innerHTML = `
        <div style="position: relative; background: #000; border-radius: 10px; overflow: hidden;">
            <video id="cameraPreview" 
                   autoplay 
                   playsinline 
                   muted
                   style="width: 100%; height: 300px; object-fit: cover; display: block;">
            </video>
            
            <!-- Простая рамка сканирования -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                       width: 250px; height: 150px; border: 3px solid #00ff00; 
                       background: rgba(0, 255, 0, 0.1);"></div>
            
            <!-- Движущаяся линия -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                       width: 250px; height: 3px; background: #00ff00; 
                       animation: scanLine 2s linear infinite;"></div>
            
            <style>
                @keyframes scanLine {
                    0% { top: 50%; }
                    50% { top: calc(50% + 150px); }
                    100% { top: 50%; }
                }
            </style>
            
            <!-- Текст -->
            <div style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center;
                       color: white; background: rgba(0,0,0,0.7); padding: 5px; font-size: 14px;">
                Наведите на штрих-код
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 15px;">
            <button onclick="stopSimpleCamera()" class="btn" style="background: #ff4757; color: white;">
                <i class="fas fa-stop"></i> Остановить
            </button>
        </div>
    `;
    
    // Настраиваем видео
    const video = document.getElementById('cameraPreview');
    if (video) {
        video.srcObject = stream;
        
        // Критически важные атрибуты для Android
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        
        video.onloadedmetadata = function() {
            console.log('🎥 Видео готово, пробуем воспроизвести...');
            video.play().catch(e => {
                console.warn('Не удалось автоматически воспроизвести:', e);
                // Пробуем с пользовательским взаимодействием
                const playBtn = document.createElement('button');
                playBtn.textContent = '▶ Нажмите для запуска видео';
                playBtn.style.cssText = `
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: #4361ee; color: white; border: none; padding: 10px 20px;
                    border-radius: 5px; cursor: pointer; z-index: 100;
                `;
                playBtn.onclick = function() {
                    video.play();
                    this.remove();
                };
                video.parentElement.appendChild(playBtn);
            });
        };
    }
}

// ===== ПОПЫТАТЬ ВСЕ МЕТОДЫ СКАНИРОВАНИЯ =====
function tryAllScanningMethods() {
    console.log('🔍 Пробуем все методы сканирования...');
    
    // 1. Сначала пробуем BarcodeDetector (лучше для Android)
    if (typeof BarcodeDetector !== 'undefined') {
        console.log('📱 Пробуем BarcodeDetector API');
        if (tryBarcodeDetector()) return;
    }
    
    // 2. Пробуем ZXing
    if (typeof ZXing !== 'undefined') {
        console.log('📚 Пробуем ZXing');
        if (tryZXing()) return;
    }
    
    // 3. Пробуем QuaggaJS как запасной вариант
    console.log('🎯 Пробуем QuaggaJS');
    tryQuaggaJS();
}

function tryBarcodeDetector() {
    try {
        const video = document.getElementById('cameraPreview');
        if (!video) return false;
        
        const detector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'datamatrix']
        });
        
        console.log('✅ BarcodeDetector создан');
        
        let lastScan = 0;
        
        function scanFrame() {
            if (!isScanning) return;
            
            const now = Date.now();
            if (now - lastScan < 300) {
                requestAnimationFrame(scanFrame);
                return;
            }
            
            lastScan = now;
            
            detector.detect(video)
                .then(barcodes => {
                    if (barcodes.length > 0) {
                        const barcode = barcodes[0];
                        console.log('🎉 BarcodeDetector нашёл:', barcode.rawValue);
                        handleSimpleScanResult(barcode.rawValue);
                        stopSimpleCamera();
                        return;
                    }
                    
                    if (isScanning) {
                        requestAnimationFrame(scanFrame);
                    }
                })
                .catch(err => {
                    console.log('BarcodeDetector ошибка:', err);
                    if (isScanning) {
                        setTimeout(scanFrame, 100);
                    }
                });
        }
        
        scanFrame();
        return true;
        
    } catch (error) {
        console.error('❌ BarcodeDetector не сработал:', error);
        return false;
    }
}

function tryZXing() {
    try {
        const video = document.getElementById('cameraPreview');
        if (!video) return false;
        
        const codeReader = new ZXing.BrowserMultiFormatReader();
        console.log('✅ ZXing создан');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        function scanWithZXing() {
            if (!isScanning || !video.videoWidth) return;
            
            try {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                codeReader.decodeFromCanvas(canvas)
                    .then(result => {
                        console.log('🎉 ZXing нашёл:', result.text);
                        handleSimpleScanResult(result.text);
                        stopSimpleCamera();
                    })
                    .catch(() => {
                        if (isScanning) {
                            setTimeout(scanWithZXing, 200);
                        }
                    });
                    
            } catch (error) {
                if (isScanning) {
                    setTimeout(scanWithZXing, 200);
                }
            }
        }
        
        scanWithZXing();
        return true;
        
    } catch (error) {
        console.error('❌ ZXing не сработал:', error);
        return false;
    }
}

function tryQuaggaJS() {
    // Загружаем QuaggaJS динамически
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
    
    script.onload = function() {
        console.log('✅ QuaggaJS загружен');
        
        const video = document.getElementById('cameraPreview');
        if (!video) return;
        
        try {
            // Создаём canvas для Quagga
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            function scanWithQuagga() {
                if (!isScanning || !video.videoWidth) return;
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                Quagga.decodeSingle({
                    src: canvas.toDataURL(),
                    numOfWorkers: 0,
                    decoder: {
                        readers: ['ean_reader', 'ean_8_reader', 'code_128_reader']
                    }
                }, function(result) {
                    if (result && result.codeResult) {
                        console.log('🎉 Quagga нашёл:', result.codeResult.code);
                        handleSimpleScanResult(result.codeResult.code);
                        stopSimpleCamera();
                    } else {
                        if (isScanning) {
                            setTimeout(scanWithQuagga, 300);
                        }
                    }
                });
            }
            
            scanWithQuagga();
            
        } catch (error) {
            console.error('❌ QuaggaJS не сработал:', error);
        }
    };
    
    script.onerror = function() {
        console.error('❌ Не удалось загрузить QuaggaJS');
        showSimpleNotification('Не удалось загрузить сканер', 'error');
    };
    
    document.head.appendChild(script);
}

// ===== ПРОСТАЯ ОБРАБОТКА РЕЗУЛЬТАТОВ =====
function handleSimpleScanResult(code) {
    console.log('📦 Обрабатываем код:', code);
    
    // Простая проверка - если это цифры, ищем продукт
    if (code && code.length >= 8) {
        searchSimpleProduct(code);
    } else {
        showSimpleNotification(`Распознан код: ${code}`, 'info');
    }
}

function stopSimpleCamera() {
    console.log('🛑 Останавливаем камеру...');
    
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
    
    // Простой плейсхолдер
    const scannerContainer = document.getElementById('qr-reader');
    if (scannerContainer) {
        scannerContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <i class="fas fa-camera" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>Камера отключена</p>
                <p style="font-size: 14px; margin-top: 10px;">
                    Нажмите "Включить сканер" чтобы снова попробовать
                </p>
            </div>
        `;
    }
    
    showSimpleNotification('Сканирование остановлено', 'info');
}

// ===== ПРОСТОЙ ПОИСК ПРОДУКТА =====
function handleSimpleManualSearch() {
    const input = document.getElementById('manualBarcode');
    const barcode = input?.value.trim();
    
    if (!barcode || barcode.length < 8) {
        showSimpleNotification('Введите корректный штрих-код (минимум 8 цифр)', 'warning');
        return;
    }
    
    searchSimpleProduct(barcode);
}

async function searchSimpleProduct(barcode) {
    try {
        // Показываем загрузку
        const checkBtn = document.getElementById('checkManual');
        if (checkBtn) {
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Поиск...';
        }
        
        console.log(`🔍 Ищем продукт: ${barcode}`);
        
        // Тестовые продукты для демонстрации
        const testProducts = {
            '3017620422003': {
                name: 'Nutella',
                brand: 'Ferrero',
                calories: '530',
                protein: '6.3',
                fat: '30.9',
                carbs: '57.5',
                weight: '400g',
                source: 'Демо'
            },
            '7622210288257': {
                name: 'Oreo Original',
                brand: 'Mondelez',
                calories: '474',
                protein: '5.2',
                fat: '20',
                carbs: '69',
                weight: '154g',
                source: 'Демо'
            },
            '4014400900508': {
                name: 'Red Bull Energy Drink',
                brand: 'Red Bull',
                calories: '45',
                protein: '0',
                fat: '0',
                carbs: '11',
                weight: '250ml',
                source: 'Демо'
            },
            '5449000000996': {
                name: 'Coca-Cola Classic',
                brand: 'Coca-Cola',
                calories: '42',
                protein: '0',
                fat: '0',
                carbs: '10.6',
                weight: '330ml',
                source: 'Демо'
            }
        };
        
        // Используем тестовые данные
        if (testProducts[barcode]) {
            setTimeout(() => {
                displaySimpleProduct(testProducts[barcode], barcode);
                resetManualButton();
            }, 500);
            return;
        }
        
        // Пробуем API (с таймаутом)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
            const response = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
                { signal: controller.signal }
            );
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.status === 1 && data.product) {
                    const product = data.product;
                    const nutrition = product.nutriments || {};
                    
                    displaySimpleProduct({
                        name: product.product_name || 'Продукт',
                        brand: product.brands || 'Не указано',
                        calories: nutrition['energy-kcal'] || '0',
                        protein: nutrition.proteins || '0',
                        fat: nutrition.fat || '0',
                        carbs: nutrition.carbohydrates || '0',
                        weight: product.quantity || 'Не указано',
                        source: 'Open Food Facts'
                    }, barcode);
                    
                    resetManualButton();
                    return;
                }
            }
        } catch (apiError) {
            console.log('API не сработал:', apiError);
        }
        
        // Если не нашли
        displaySimpleProduct({
            name: `Продукт ${barcode}`,
            brand: 'Неизвестно',
            calories: '0',
            protein: '0',
            fat: '0',
            carbs: '0',
            weight: 'Не указано',
            source: 'Не найдено'
        }, barcode);
        
        showSimpleNotification('Продукт не найден в базе', 'warning');
        
    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        showSimpleNotification('Ошибка поиска', 'error');
    } finally {
        resetManualButton();
    }
}

function resetManualButton() {
    const checkBtn = document.getElementById('checkManual');
    if (checkBtn) {
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-search"></i> Найти';
    }
}

function displaySimpleProduct(product, barcode) {
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
        'scanDate': new Date().toLocaleString('ru-RU')
    };
    
    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
    
    // Показываем результат
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        resultDiv.classList.remove('hidden');
        
        setTimeout(() => {
            resultDiv.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }
    
    showSimpleNotification('Продукт найден!', 'success');
    
    // Автоматически сохраняем в историю
    saveToHistory();
}

// ===== ИСТОРИЯ (оставляем как было) =====
function loadHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>История сканирований пуста</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = '';
    
    history.slice(-10).reverse().forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div style="flex: 1;">
                <div class="history-name">${item.name || 'Продукт'}</div>
                <div class="history-details">
                    <span>${item.brand || 'Бренд'}</span>
                </div>
            </div>
            <div class="history-nutrition">
                <div class="history-calories">${item.calories || '0'} ккал</div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            if (item.barcode) {
                searchSimpleProduct(item.barcode);
            }
        });
        
        historyList.appendChild(div);
    });
}

function saveToHistory() {
    if (!currentProduct) return;
    
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    // Проверяем, нет ли уже такого продукта
    const existingIndex = history.findIndex(item => item.barcode === currentProduct.barcode);
    
    if (existingIndex !== -1) {
        history[existingIndex] = currentProduct;
    } else {
        history.push(currentProduct);
    }
    
    // Ограничиваем историю
    const limitedHistory = history.slice(-50);
    localStorage.setItem('bjuHistory', JSON.stringify(limitedHistory));
    
    loadHistory();
}

function clearHistory() {
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    if (history.length === 0) {
        showSimpleNotification('История уже пуста', 'info');
        return;
    }
    
    if (confirm(`Очистить историю (${history.length} записей)?`)) {
        localStorage.removeItem('bjuHistory');
        loadHistory();
        showSimpleNotification('История очищена', 'success');
    }
}

// ===== АЛЬТЕРНАТИВЫ ДЛЯ ANDROID =====
function showAndroidAlternatives() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div style="text-align: center; padding: 30px 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 20px;">
                <i class="fas fa-mobile-alt"></i> Решения для Android
            </h3>
            
            <div style="background: var(--bg-tertiary); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <p style="color: var(--text-secondary); margin-bottom: 15px;">
                    <strong>Попробуйте:</strong>
                </p>
                
                <ol style="text-align: left; color: var(--text-secondary); padding-left: 20px; line-height: 1.6;">
                    <li>Откройте в <strong>Chrome</strong> (не в Telegram)</li>
                    <li>Разрешите доступ к камере в настройках</li>
                    <li>Используйте <strong>заднюю камеру</strong></li>
                    <li>Или введите код вручную ↓</li>
                </ol>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button onclick="document.getElementById('manualBarcode').focus()" 
                        class="btn btn-primary">
                    <i class="fas fa-keyboard"></i> Ввести код вручную
                </button>
                
                <button onclick="startSimpleCamera()" 
                        class="btn" style="background: var(--info-color); color: white;">
                    <i class="fas fa-redo"></i> Попробовать снова
                </button>
            </div>
        </div>
    `;
}

// ===== ПРОСТЫЕ УТИЛИТЫ =====
function showSimpleNotification(message, type = 'info') {
    // Создаем простое уведомление
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 90%;
            text-align: center;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(notification);
    }
    
    // Цвета
    const colors = {
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    notification.textContent = message;
    notification.style.background = colors[type] || colors.info;
    notification.style.opacity = '1';
    
    // Автоскрытие
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
window.testAndroidCamera = function() {
    console.log('🧪 Тестируем камеру на Android...');
    startSimpleCamera();
};

window.testBarcodeScan = function(code = '3017620422003') {
    console.log('🧪 Тестовое сканирование:', code);
    handleSimpleScanResult(code);
};

// Запускаем простой скролл-бар
window.addEventListener('scroll', function() {
    const progress = document.getElementById('progressFill');
    if (!progress) return;
    
    const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    progress.style.width = Math.min(scrolled, 100) + '%';
});