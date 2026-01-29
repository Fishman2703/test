// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP =====
const tg = window.Telegram.WebApp;
if (tg && tg.initData) {
    tg.expand(); // Раскрываем на весь экран
    tg.setHeaderColor('#4361ee');
    tg.setBackgroundColor('#f8f9fa');
    tg.enableClosingConfirmation();
}

// ===== ЭЛЕМЕНТЫ DOM =====
const startScannerBtn = document.getElementById('startScanner');
const stopScannerBtn = document.getElementById('stopScanner');
const checkManualBtn = document.getElementById('checkManual');
const saveProductBtn = document.getElementById('saveProduct');
const clearHistoryBtn = document.getElementById('clearHistory');
const resultDiv = document.getElementById('result');
const historyList = document.getElementById('historyList');
const manualBarcodeInput = document.getElementById('manualBarcode');
const progressFill = document.getElementById('progressFill');

// ===== ПЕРЕМЕННЫЕ =====
let currentStream = null;
let currentProduct = null;
let currentRotation = 0;
let isScanningActive = false;
let barcodeDetector = null;
let lastScanTime = 0;
const SCAN_DELAY = 1000; // 1 секунда между сканированиями

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Приложение "Сканер БЖУ" загружается...');
    
    // Инициализация темы
    initTheme();
    
    // Загрузка истории
    loadHistory();
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    // Проверка поддержки камеры
    checkCameraSupport();
    
    // Проверка, запущено ли в Telegram
    if (tg && tg.initData) {
        console.log('📱 Запущено в Telegram Mini App');
        setupTelegramFeatures();
    } else {
        console.log('🌐 Запущено в браузере');
    }
    
    // Автофокус на поле ввода
    if (manualBarcodeInput) {
        manualBarcodeInput.focus();
    }
    
    // Обновление прогресс-бара при прокрутке
    window.addEventListener('scroll', updateProgressBar);
    
    console.log('✅ Приложение готово к работе');
});

// ===== ФУНКЦИИ ТЕМЫ =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Обновляем иконку темы
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Устанавливаем цвета для прогресс-бара
    if (savedTheme === 'dark') {
        document.documentElement.style.setProperty('--progress-color', '#4361ee');
    }
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    // Кнопки сканера
    if (startScannerBtn) {
        startScannerBtn.addEventListener('click', initScanner);
    }
    
    if (stopScannerBtn) {
        stopScannerBtn.addEventListener('click', stopScanner);
    }
    
    // Ручной ввод
    if (checkManualBtn) {
        checkManualBtn.addEventListener('click', handleManualSearch);
    }
    
    if (manualBarcodeInput) {
        manualBarcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleManualSearch();
            }
        });
    }
    
    // История
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', saveToHistory);
    }
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    // Тестовые штрих-коды
    document.querySelectorAll('.code-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const barcode = this.dataset.code;
            if (manualBarcodeInput) {
                manualBarcodeInput.value = barcode;
                handleManualSearch();
            }
            
            // Визуальный фидбэк
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });
}

// ===== ПРОВЕРКА ПОДДЕРЖКИ КАМЕРЫ =====
function checkCameraSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('⚠️ Камера не поддерживается в этом браузере');
        showNotification('Ваш браузер не поддерживает доступ к камере. Используйте ручной ввод или загрузку фото.', 'warning');
    }
}

// ===== ФУНКЦИИ TELEGRAM =====
function setupTelegramFeatures() {
    // Добавляем обработчик закрытия
    if (tg && tg.close) {
        const closeBtn = document.getElementById('closeApp');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                tg.close();
            });
        }
    }
    
    // Настраиваем кнопку меню
    if (tg.MainButton) {
        tg.MainButton.setText('Сканировать');
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            initScanner();
        });
    }
}

// ===== ПРОГРЕСС-БАР =====
function updateProgressBar() {
    if (!progressFill) return;
    
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressFill.style.width = scrolled + "%";
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Определяем цвет уведомления
    let backgroundColor, icon;
    switch(type) {
        case 'success':
            backgroundColor = 'var(--success-color)';
            icon = '✓';
            break;
        case 'error':
            backgroundColor = 'var(--danger-color)';
            icon = '✗';
            break;
        case 'warning':
            backgroundColor = 'var(--warning-color)';
            icon = '⚠';
            break;
        default:
            backgroundColor = 'var(--info-color)';
            icon = 'ℹ';
    }
    
    // Устанавливаем содержимое и стили
    notification.innerHTML = `<span style="margin-right: 8px;">${icon}</span>${message}`;
    notification.style.background = backgroundColor;
    notification.classList.remove('hidden');
    
    // Скрываем через 3 секунды
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease';
    }, 10);
}

// ===== ИСТОРИЯ =====
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    if (!historyList) return;
    
    // Очищаем список
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p style="font-size: 16px;">История сканирований пуста</p>
                <p style="font-size: 14px; margin-top: 8px;">Отсканируйте первый продукт!</p>
            </div>
        `;
        return;
    }
    
    // Показываем последние 10 записей (новые сверху)
    history.slice(-10).reverse().forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.setAttribute('data-barcode', item.barcode);
        
        // Форматируем дату
        const scanDate = item.date ? new Date(item.date).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit'
        }) : '--.--';
        
        div.innerHTML = `
            <div style="flex: 1;">
                <div class="history-name">${item.name || 'Неизвестный продукт'}</div>
                <div class="history-details">
                    <span style="margin-right: 10px;">${item.brand || 'Неизвестный бренд'}</span>
                    <span>${scanDate}</span>
                </div>
            </div>
            <div class="history-nutrition">
                <div class="history-calories">${item.calories || '0'} ккал</div>
                <div class="history-macros">${item.protein || '0'}/${item.fat || '0'}/${item.carbs || '0'}</div>
            </div>
        `;
        
        // Обработчик клика для повторного поиска
        div.addEventListener('click', function() {
            const barcode = this.getAttribute('data-barcode');
            if (barcode) {
                searchProduct(barcode);
                // Плавная прокрутка к результату
                setTimeout(() => {
                    resultDiv.scrollIntoView({ behavior: 'smooth' });
                }, 100);
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
    
    // Проверяем, нет ли уже такого продукта (по штрих-коду)
    const existingIndex = history.findIndex(item => item.barcode === currentProduct.barcode);
    
    if (existingIndex !== -1) {
        // Обновляем существующую запись
        history[existingIndex] = currentProduct;
        showNotification('Запись обновлена в истории', 'success');
    } else {
        // Добавляем новую запись
        history.push(currentProduct);
        showNotification('Продукт сохранён в истории', 'success');
    }
    
    // Ограничиваем историю 50 записями
    const limitedHistory = history.slice(-50);
    localStorage.setItem('bjuHistory', JSON.stringify(limitedHistory));
    
    // Обновляем отображение
    loadHistory();
    
    // Анимация кнопки сохранения
    if (saveProductBtn) {
        saveProductBtn.innerHTML = '<i class="fas fa-check"></i>';
        saveProductBtn.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            saveProductBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
            saveProductBtn.style.background = '';
        }, 1000);
    }
}

function clearHistory() {
    if (localStorage.getItem('bjuHistory')) {
        if (confirm('Вы уверены, что хотите очистить всю историю сканирований?')) {
            localStorage.removeItem('bjuHistory');
            loadHistory();
            showNotification('История очищена', 'success');
        }
    } else {
        showNotification('История уже пуста', 'info');
    }
}

// ===== ПОИСК ПРОДУКТА =====
function handleManualSearch() {
    if (!manualBarcodeInput) return;
    
    const barcode = manualBarcodeInput.value.trim();
    
    if (!barcode) {
        showNotification('Введите штрих-код', 'warning');
        manualBarcodeInput.focus();
        return;
    }
    
    if (barcode.length < 8) {
        showNotification('Штрих-код должен содержать минимум 8 цифр', 'warning');
        manualBarcodeInput.focus();
        return;
    }
    
    // Визуальный фидбэк
    manualBarcodeInput.style.borderColor = 'var(--accent-color)';
    setTimeout(() => {
        manualBarcodeInput.style.borderColor = '';
    }, 500);
    
    searchProduct(barcode);
}

async function searchProduct(barcode) {
    // Проверяем задержку между запросами
    const now = Date.now();
    if (now - lastScanTime < 1000) {
        return; // Игнорируем слишком частые запросы
    }
    lastScanTime = now;
    
    try {
        showLoading(true);
        console.log(`🔍 Поиск продукта: ${barcode}`);
        
        // Тестовые данные для демо
        const testProducts = {
            '3017620422003': {
                name: 'Nutella',
                brand: 'Ferrero',
                calories: '530',
                protein: '6.3',
                fat: '30.9',
                carbs: '57.5',
                weight: '400g',
                status: 'found'
            },
            '7622210288257': {
                name: 'Oreo Original',
                brand: 'Mondelez',
                calories: '474',
                protein: '5.2',
                fat: '20',
                carbs: '69',
                weight: '154g',
                status: 'found'
            },
            '4014400900508': {
                name: 'Red Bull Energy Drink',
                brand: 'Red Bull',
                calories: '45',
                protein: '0',
                fat: '0',
                carbs: '11',
                weight: '250ml',
                status: 'found'
            },
            '5449000000996': {
                name: 'Coca-Cola Classic',
                brand: 'Coca-Cola',
                calories: '42',
                protein: '0',
                fat: '0',
                carbs: '10.6',
                weight: '330ml',
                status: 'found'
            },
            '5901234123457': {
                name: 'Молочный шоколад',
                brand: 'Шоколадная фабрика',
                calories: '550',
                protein: '8',
                fat: '32',
                carbs: '55',
                weight: '100g',
                status: 'found'
            }
        };
        
        // Используем тестовые данные, если есть
        if (testProducts[barcode]) {
            setTimeout(() => {
                displayProduct(testProducts[barcode], barcode);
                showLoading(false);
            }, 800);
            return;
        }
        
        // Реальный запрос к API Open Food Facts
        showNotification('Поиск в базе данных...', 'info');
        
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
            {
                headers: {
                    'User-Agent': 'NutritionScanner/1.0'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Ошибка API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 1 && data.product) {
            const product = data.product;
            
            // Извлекаем данные о питательной ценности
            const nutrition = product.nutriments || {};
            
            displayProduct({
                name: product.product_name || 
                     product.product_name_ru || 
                     product.product_name_en || 
                     'Неизвестный продукт',
                brand: product.brands || 
                      product.brand_owner || 
                      product.brand || 
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
                status: 'found'
            }, barcode);
            
            showNotification('Продукт найден!', 'success');
            
        } else {
            // Продукт не найден
            displayProduct({
                name: `Продукт ${barcode}`,
                brand: 'Неизвестный бренд',
                calories: '0',
                protein: '0',
                fat: '0',
                carbs: '0',
                weight: 'Не указано',
                status: 'not_found'
            }, barcode);
            
            showNotification('Продукт не найден в базе', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Ошибка при поиске:', error);
        
        // Показываем тестовые данные при ошибке
        displayProduct({
            name: 'Пример продукта',
            brand: 'Тестовый бренд',
            calories: '250',
            protein: '10',
            fat: '5',
            carbs: '30',
            weight: '100g',
            status: 'demo'
        }, barcode || '0000000000000');
        
        showNotification('Используем демо-данные', 'info');
    } finally {
        showLoading(false);
    }
}

// ===== ОТОБРАЖЕНИЕ ПРОДУКТА =====
function displayProduct(product, barcode) {
    const now = new Date();
    const scanDate = now.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    currentProduct = { 
        ...product, 
        barcode,
        date: now.toISOString()
    };
    
    // Обновляем UI элементов
    const elements = {
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
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Обновляем статус продукта
    const statusElement = document.getElementById('productStatus');
    if (statusElement) {
        let statusText = '';
        switch(product.status) {
            case 'found':
                statusText = '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> Найдено</span>';
                break;
            case 'not_found':
                statusText = '<span style="color: var(--warning-color);"><i class="fas fa-exclamation-triangle"></i> Не найдено</span>';
                break;
            case 'demo':
                statusText = '<span style="color: var(--info-color);"><i class="fas fa-flask"></i> Демо-данные</span>';
                break;
            default:
                statusText = '<span style="color: var(--text-secondary);"><i class="fas fa-question-circle"></i> Неизвестно</span>';
        }
        statusElement.innerHTML = statusText;
    }
    
    // Показываем секцию с результатами
    if (resultDiv) {
        resultDiv.classList.remove('hidden');
        
        // Плавная прокрутка к результатам
        setTimeout(() => {
            resultDiv.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 300);
    }
    
    // Отправляем данные в Telegram (если в мини-приложении)
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            action: 'product_scanned',
            barcode: barcode,
            name: product.name,
            calories: product.calories,
            protein: product.protein,
            fat: product.fat,
            carbs: product.carbs,
            timestamp: now.toISOString()
        }));
    }
    
    // Воспроизводим звук успеха
    playSuccessSound();
    
    console.log(`✅ Продукт отображен: ${product.name}`);
}

// ===== СКАНЕР =====
async function initScanner() {
    console.log('📷 Инициализация сканера...');
    
    // Проверяем поддержку камеры
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Камера не поддерживается в вашем браузере', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Запрашиваем доступ к камере
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Задняя камера
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        currentStream = stream;
        isScanningActive = true;
        
        // Обновляем UI
        if (startScannerBtn) startScannerBtn.classList.add('hidden');
        if (stopScannerBtn) stopScannerBtn.classList.remove('hidden');
        
        // Создаём интерфейс сканера
        createScannerUI(stream);
        
        // Настраиваем видео
        const video = document.getElementById('cameraPreview');
        if (video) {
            video.srcObject = stream;
            setupCameraView(video, stream);
        }
        
        // Запускаем распознавание штрих-кодов
        await startBarcodeDetection(video);
        
        showNotification('Сканер активирован', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка доступа к камере:', error);
        handleCameraError(error);
    } finally {
        showLoading(false);
    }
}

function createScannerUI(stream) {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div class="camera-container">
            <video id="cameraPreview" autoplay playsinline muted 
                   style="width: 100%; height: auto; border-radius: var(--radius);"></video>
            <div class="scan-overlay">
                <div class="scan-line"></div>
                <div style="position: absolute; top: -30px; left: 10px; 
                           color: white; font-size: 12px; background: rgba(0,0,0,0.7); 
                           padding: 4px 8px; border-radius: 4px;">
                    🎯 Наведите камеру на штрих-код
                </div>
            </div>
            <div class="scan-hint">
                Держите устройство параллельно штрих-коду
            </div>
        </div>
        <div class="camera-controls" style="margin-top: 15px;">
            <button id="switchCamera" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); margin: 5px;">
                <i class="fas fa-sync-alt"></i> Переключить
            </button>
            <button id="toggleTorch" class="btn" style="background: var(--warning-color); color: white; margin: 5px;">
                <i class="fas fa-lightbulb"></i> Фонарик
            </button>
            <button id="rotateView" class="btn" style="background: var(--info-color); color: white; margin: 5px;">
                <i class="fas fa-redo"></i> Повернуть
            </button>
        </div>
    `;
    
    // Настраиваем обработчики кнопок
    setTimeout(() => {
        const video = document.getElementById('cameraPreview');
        if (!video) return;
        
        // Переключение камеры
        const switchBtn = document.getElementById('switchCamera');
        if (switchBtn) {
            switchBtn.addEventListener('click', () => switchCamera(stream, video));
        }
        
        // Фонарик
        const torchBtn = document.getElementById('toggleTorch');
        if (torchBtn) {
            torchBtn.addEventListener('click', () => toggleTorch(stream));
        }
        
        // Поворот вида
        const rotateBtn = document.getElementById('rotateView');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', () => rotateCameraView(video));
        }
    }, 100);
}

function setupCameraView(videoElement, stream) {
    try {
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        
        // Определяем тип камеры
        const isFrontCamera = settings.facingMode === 'user' || 
                             settings.facingMode === 'left' || 
                             settings.facingMode === 'right';
        
        // Применяем трансформацию
        if (isFrontCamera) {
            videoElement.style.transform = 'scaleX(-1)'; // Зеркальное для фронтальной
        } else {
            videoElement.style.transform = 'scaleX(1)'; // Нормальное для задней
        }
        
        videoElement.dataset.cameraType = isFrontCamera ? 'front' : 'back';
        
    } catch (error) {
        console.warn('Не удалось определить тип камеры:', error);
        videoElement.style.transform = 'scaleX(1)';
    }
}

async function startBarcodeDetection(video) {
    if (!video) return;
    
    console.log('🔍 Запуск распознавания штрих-кодов...');
    
    // Используем BarcodeDetector API, если доступен
    if ('BarcodeDetector' in window) {
        try {
            barcodeDetector = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
            });
            
            // Запускаем цикл распознавания
            detectBarcodesLoop(video);
            
        } catch (error) {
            console.error('Ошибка BarcodeDetector:', error);
            useZXingScanner(video);
        }
    } else {
        useZXingScanner(video);
    }
}

async function detectBarcodesLoop(video) {
    if (!isScanningActive || !barcodeDetector) return;
    
    try {
        const barcodes = await barcodeDetector.detect(video);
        
        if (barcodes.length > 0) {
            const barcode = barcodes[0];
            console.log('📸 Найден штрих-код:', barcode.rawValue);
            
            // Останавливаем сканирование
            stopScanner();
            
            // Ищем продукт
            searchProduct(barcode.rawValue);
            
            // Воспроизводим звук
            playScanSound();
            
            return;
        }
    } catch (error) {
        // Игнорируем ошибки распознавания
    }
    
    // Продолжаем сканирование
    if (isScanningActive) {
        requestAnimationFrame(() => detectBarcodesLoop(video));
    }
}

function useZXingScanner(video) {
    console.log('📚 Используем ZXing для распознавания');
    
    // ZXing уже загружен через CDN в index.html
    if (typeof ZXing === 'undefined') {
        console.error('ZXing не загружен');
        showNotification('Ошибка загрузки сканера', 'error');
        return;
    }
    
    const codeReader = new ZXing.BrowserMultiFormatReader();
    
    // Создаём canvas для захвата кадра
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    function captureAndDecode() {
        if (!isScanningActive || !video.videoWidth) return;
        
        try {
            // Устанавливаем размеры canvas
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Рисуем текущий кадр
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Пытаемся распознать
            codeReader.decodeFromCanvas(canvas)
                .then(result => {
                    console.log('ZXing найден код:', result.text);
                    
                    stopScanner();
                    searchProduct(result.text);
                    playScanSound();
                })
                .catch(() => {
                    // Продолжаем сканирование
                    if (isScanningActive) {
                        requestAnimationFrame(captureAndDecode);
                    }
                });
                
        } catch (error) {
            if (isScanningActive) {
                setTimeout(captureAndDecode, 100);
            }
        }
    }
    
    captureAndDecode();
}

async function switchCamera(oldStream, video) {
    if (!oldStream || !video) return;
    
    try {
        // Останавливаем старый поток
        oldStream.getTracks().forEach(track => track.stop());
        
        // Определяем текущую камеру
        const track = oldStream.getVideoTracks()[0];
        const settings = track.getSettings();
        const currentFacingMode = settings.facingMode || 'environment';
        
        // Выбираем противоположную камеру
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        // Запрашиваем новую камеру
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: newFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        currentStream = newStream;
        video.srcObject = newStream;
        
        // Настраиваем отображение
        setupCameraView(video, newStream);
        
        showNotification(`Камера: ${newFacingMode === 'environment' ? 'Задняя' : 'Фронтальная'}`, 'info');
        
    } catch (error) {
        console.error('Ошибка переключения камеры:', error);
        showNotification('Не удалось переключить камеру', 'error');
    }
}

async function toggleTorch(stream) {
    try {
        const track = stream.getVideoTracks()[0];
        
        // Проверяем поддержку фонарика
        if ('torch' in track.getCapabilities()) {
            const torchBtn = document.getElementById('toggleTorch');
            const isTorchOn = track.getConstraints().torch || false;
            
            await track.applyConstraints({
                advanced: [{ torch: !isTorchOn }]
            });
            
            if (torchBtn) {
                torchBtn.innerHTML = !isTorchOn ? 
                    '<i class="fas fa-lightbulb"></i> Выкл.' : 
                    '<i class="fas fa-lightbulb"></i> Вкл.';
                torchBtn.style.background = !isTorchOn ? 'var(--danger-color)' : 'var(--warning-color)';
            }
            
            showNotification(`Фонарик ${!isTorchOn ? 'включён' : 'выключен'}`, 'info');
        } else {
            showNotification('Фонарик не поддерживается', 'warning');
        }
    } catch (error) {
        console.error('Ошибка фонарика:', error);
        showNotification('Не удалось включить фонарик', 'error');
    }
}

function rotateCameraView(video) {
    const rotations = [0, 90, 180, 270];
    currentRotation = (currentRotation + 1) % rotations.length;
    
    const rotation = rotations[currentRotation];
    const cameraType = video.dataset.cameraType || 'back';
    const baseTransform = cameraType === 'front' ? 'scaleX(-1)' : 'scaleX(1)';
    
    video.style.transform = `${baseTransform} rotate(${rotation}deg)`;
    
    // Обновляем подсказку
    const hints = [
        'Держите устройство горизонтально',
        'Поверните на 90° вправо',
        'Переверните устройство',
        'Поверните на 90° влево'
    ];
    
    const hintElement = document.querySelector('.scan-hint');
    if (hintElement) {
        hintElement.textContent = hints[currentRotation];
    }
    
    showNotification(`Поворот: ${rotation}°`, 'info');
}

function stopScanner() {
    console.log('🛑 Остановка сканера...');
    
    isScanningActive = false;
    
    // Останавливаем видео поток
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Обновляем UI
    if (startScannerBtn) startScannerBtn.classList.remove('hidden');
    if (stopScannerBtn) stopScannerBtn.classList.add('hidden');
    
    // Восстанавливаем плейсхолдер
    const scannerContainer = document.getElementById('qr-reader');
    if (scannerContainer) {
        scannerContainer.innerHTML = `
            <div class="scanner-placeholder" style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-camera" style="font-size: 48px; color: var(--text-muted); margin-bottom: 15px;"></i>
                <p style="color: var(--text-secondary);">Сканер отключен</p>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 10px;">
                    Нажмите "Включить сканер" для повторного сканирования
                </p>
            </div>
        `;
    }
    
    showNotification('Сканер остановлен', 'info');
}

function handleCameraError(error) {
    console.error('📷 Ошибка камеры:', error);
    
    let message = '';
    switch(error.name) {
        case 'NotAllowedError':
            message = 'Доступ к камере запрещён. Разрешите доступ в настройках браузера.';
            break;
        case 'NotFoundError':
            message = 'Камера не найдена. Убедитесь, что камера подключена.';
            break;
        case 'NotSupportedError':
            message = 'Ваш браузер не поддерживает доступ к камере.';
            break;
        case 'NotReadableError':
            message = 'Камера уже используется другим приложением.';
            break;
        default:
            message = `Ошибка камеры: ${error.message || 'неизвестная ошибка'}`;
    }
    
    showNotification(message, 'error');
    
    // Показываем альтернативные варианты
    showAlternativeOptions();
}

function showAlternativeOptions() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div style="text-align: center; padding: 30px 20px; background: var(--bg-tertiary); border-radius: var(--radius);">
            <h3 style="color: var(--text-primary); margin-bottom: 15px;">
                <i class="fas fa-exclamation-triangle"></i> Камера недоступна
            </h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                Используйте альтернативные способы:
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px; max-width: 300px; margin: 0 auto;">
                <button id="uploadPhotoBtn" class="btn btn-primary">
                    <i class="fas fa-camera"></i> Сфотографировать штрих-код
                </button>
                <button id="useDemoBtn" class="btn" style="background: var(--info-color); color: white;">
                    <i class="fas fa-flask"></i> Использовать демо-данные
                </button>
            </div>
        </div>
    `;
    
    // Обработчики альтернативных кнопок
    setTimeout(() => {
        const uploadBtn = document.getElementById('uploadPhotoBtn');
        const demoBtn = document.getElementById('useDemoBtn');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', showFileUpload);
        }
        
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                searchProduct('3017620422003'); // Nutella
            });
        }
    }, 100);
}

function showFileUpload() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 15px;">
                <i class="fas fa-file-upload"></i> Загрузка фото
            </h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                Сфотографируйте штрих-код или выберите файл
            </p>
            
            <div style="margin: 20px 0;">
                <input type="file" id="fileInput" accept="image/*" capture="environment" 
                       style="display: none;">
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="takePhotoBtn" class="btn btn-primary">
                        <i class="fas fa-camera"></i> Сделать фото
                    </button>
                    <button id="chooseFileBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary);">
                        <i class="fas fa-folder-open"></i> Выбрать файл
                    </button>
                </div>
            </div>
            
            <div id="photoPreview" style="margin-top: 20px;"></div>
        </div>
    `;
    
    setTimeout(() => {
        const takePhotoBtn = document.getElementById('takePhotoBtn');
        const chooseFileBtn = document.getElementById('chooseFileBtn');
        const fileInput = document.getElementById('fileInput');
        
        if (takePhotoBtn) {
            takePhotoBtn.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }
        
        if (chooseFileBtn) {
            chooseFileBtn.addEventListener('click', () => {
                if (fileInput) {
                    fileInput.removeAttribute('capture');
                    fileInput.click();
                }
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    processImageFile(file);
                }
            });
        }
    }, 100);
}

async function processImageFile(file) {
    const preview = document.getElementById('photoPreview');
    if (!preview) return;
    
    preview.innerHTML = '<p style="color: var(--text-secondary);">⏳ Обработка изображения...</p>';
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = async function() {
            preview.innerHTML = `
                <img src="${img.src}" style="max-width: 300px; border-radius: var(--radius); border: 2px solid var(--border-color); margin-bottom: 15px;">
                <p style="color: var(--text-secondary);">🔍 Анализ изображения...</p>
            `;
            
            try {
                if ('BarcodeDetector' in window) {
                    const detector = new BarcodeDetector({
                        formats: ['ean_13', 'ean_8', 'upc_a', 'code_128']
                    });
                    
                    const barcodes = await detector.detect(img);
                    
                    if (barcodes.length > 0) {
                        const barcode = barcodes[0].rawValue;
                        preview.innerHTML += `
                            <div style="background: var(--success-color); color: white; padding: 10px; border-radius: var(--radius-sm); margin-top: 10px;">
                                ✅ Найден штрих-код: <strong>${barcode}</strong>
                            </div>
                            <button onclick="searchProduct('${barcode}')" class="btn btn-success" style="margin-top: 10px;">
                                <i class="fas fa-search"></i> Найти продукт
                            </button>
                        `;
                    } else {
                        preview.innerHTML += `
                            <div style="background: var(--warning-color); color: white; padding: 10px; border-radius: var(--radius-sm); margin-top: 10px;">
                                ❌ Штрих-код не найден на фото
                            </div>
                        `;
                    }
                } else {
                    preview.innerHTML += `
                        <div style="background: var(--warning-color); color: white; padding: 10px; border-radius: var(--radius-sm); margin-top: 10px;">
                            ⚠️ Распознавание изображений не поддерживается
                        </div>
                    `;
                }
            } catch (error) {
                preview.innerHTML += `
                    <div style="background: var(--danger-color); color: white; padding: 10px; border-radius: var(--radius-sm); margin-top: 10px;">
                        ❌ Ошибка распознавания
                    </div>
                `;
            }
        };
    };
    
    reader.readAsDataURL(file);
}

// ===== УТИЛИТЫ =====
function showLoading(show) {
    const buttons = [startScannerBtn, checkManualBtn];
    
    buttons.forEach(btn => {
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
    
    if (show) {
        showNotification('Загрузка...', 'info');
    }
}

function playScanSound() {
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

function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
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

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ОТЛАДКИ =====
window.debugApp = {
    clearData: () => {
        localStorage.clear();
        loadHistory();
        showNotification('Все данные очищены', 'success');
    },
    testScan: (barcode = '3017620422003') => {
        searchProduct(barcode);
    },
    getHistory: () => {
        return JSON.parse(localStorage.getItem('bjuHistory')) || [];
    },
    simulateError: () => {
        handleCameraError(new Error('Тестовая ошибка'));
    },
    toggleTheme: () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
};

console.log('✅ app.js успешно загружен');