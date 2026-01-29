// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP =====
const tg = window.Telegram.WebApp;
if (tg && tg.initData) {
    tg.expand();
    tg.setHeaderColor('#4361ee');
    tg.setBackgroundColor('#f8f9fa');
    tg.enableClosingConfirmation();
}

// ===== ЭЛЕМЕНТЫ DOM =====
const elements = {
    startScannerBtn: document.getElementById('startScanner'),
    stopScannerBtn: document.getElementById('stopScanner'),
    checkManualBtn: document.getElementById('checkManual'),
    saveProductBtn: document.getElementById('saveProduct'),
    clearHistoryBtn: document.getElementById('clearHistory'),
    resultDiv: document.getElementById('result'),
    historyList: document.getElementById('historyList'),
    manualBarcodeInput: document.getElementById('manualBarcode'),
    progressFill: document.getElementById('progressFill'),
    themeToggle: document.getElementById('themeToggle'),
    closeApp: document.getElementById('closeApp')
};

// ===== ПЕРЕМЕННЫЕ =====
let currentStream = null;
let currentProduct = null;
let isScanningActive = false;
let currentFacingMode = 'environment';
let torchEnabled = false;
let codeReader = null;

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Сканер БЖУ инициализируется...');
    
    initTheme();
    loadHistory();
    setupEventListeners();
    checkCameraSupport();
    
    if (tg && tg.initData) {
        console.log('📱 Запущено в Telegram Mini App');
        setupTelegramFeatures();
    }
    
    // Автофокус на поле ввода
    if (elements.manualBarcodeInput) {
        elements.manualBarcodeInput.focus();
    }
    
    // Обновление прогресс-бара
    window.addEventListener('scroll', updateProgressBar);
    
    // Проверяем iOS
    detectIOS();
});

// ===== ОПРЕДЕЛЕНИЕ IOS =====
function detectIOS() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        console.log('📱 Обнаружено iOS устройство');
        // Добавляем специфичные для iOS настройки
        document.body.classList.add('ios-device');
    }
    return isIOS;
}

// ===== ФУНКЦИИ ТЕМЫ =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (elements.themeToggle) {
        const icon = elements.themeToggle.querySelector('i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    // Основные кнопки
    if (elements.startScannerBtn) {
        elements.startScannerBtn.addEventListener('click', initScanner);
    }
    
    if (elements.stopScannerBtn) {
        elements.stopScannerBtn.addEventListener('click', stopScanner);
    }
    
    if (elements.checkManualBtn) {
        elements.checkManualBtn.addEventListener('click', handleManualSearch);
    }
    
    if (elements.saveProductBtn) {
        elements.saveProductBtn.addEventListener('click', saveToHistory);
    }
    
    if (elements.clearHistoryBtn) {
        elements.clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    // Ручной ввод по Enter
    if (elements.manualBarcodeInput) {
        elements.manualBarcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleManualSearch();
            }
        });
    }
    
    // Тестовые штрих-коды
    document.querySelectorAll('.code-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const barcode = this.dataset.code;
            if (elements.manualBarcodeInput) {
                elements.manualBarcodeInput.value = barcode;
                handleManualSearch();
            }
        });
    });
    
    // Кнопка темы
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Кнопка закрытия
    if (elements.closeApp) {
        elements.closeApp.addEventListener('click', function() {
            if (tg && tg.close) {
                tg.close();
            } else {
                if (confirm('Закрыть приложение?')) {
                    window.close();
                }
            }
        });
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = elements.themeToggle.querySelector('i');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    showNotification(`Тема: ${newTheme === 'dark' ? 'тёмная' : 'светлая'}`, 'info');
}

// ===== ПРОВЕРКА ПОДДЕРЖКИ КАМЕРЫ =====
function checkCameraSupport() {
    const isIOS = detectIOS();
    
    // iOS имеет специфичные требования
    if (isIOS) {
        console.log('ℹ️ iOS устройство - используем специфичные настройки');
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification(
            isIOS ? 
            'В iOS используйте Safari и разрешите доступ к камере' : 
            'Браузер не поддерживает камеру. Используйте ручной ввод.', 
            'warning'
        );
        return false;
    }
    
    return true;
}

// ===== ФУНКЦИИ TELEGRAM =====
function setupTelegramFeatures() {
    if (tg.MainButton) {
        tg.MainButton.setText('Сканировать');
        tg.MainButton.show();
        tg.MainButton.onClick(initScanner);
    }
}

// ===== ПРОГРЕСС-БАР =====
function updateProgressBar() {
    if (!elements.progressFill) return;
    
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = Math.min((winScroll / height) * 100, 100);
    elements.progressFill.style.width = scrolled + "%";
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(message, type = 'info') {
    // Создаём уведомление, если его нет
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification hidden';
        document.body.appendChild(notification);
    }
    
    // Цвета по типам
    const colors = {
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    notification.innerHTML = message;
    notification.style.background = colors[type] || colors.info;
    notification.classList.remove('hidden');
    
    // Автоскрытие
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// ===== ИСТОРИЯ =====
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    if (!elements.historyList) return;
    
    elements.historyList.innerHTML = '';
    
    if (history.length === 0) {
        elements.historyList.innerHTML = `
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
        
        elements.historyList.appendChild(div);
    });
}

function saveToHistory() {
    if (!currentProduct) {
        showNotification('Сначала отсканируйте продукт!', 'warning');
        return;
    }
    
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    // Проверка на дубликаты
    const existingIndex = history.findIndex(item => item.barcode === currentProduct.barcode);
    
    if (existingIndex !== -1) {
        history[existingIndex] = currentProduct;
        showNotification('Запись обновлена', 'success');
    } else {
        history.push(currentProduct);
        showNotification('Сохранено в историю', 'success');
    }
    
    // Ограничение истории
    const limitedHistory = history.slice(-50);
    localStorage.setItem('bjuHistory', JSON.stringify(limitedHistory));
    
    loadHistory();
}

function clearHistory() {
    if (!localStorage.getItem('bjuHistory')) {
        showNotification('История уже пуста', 'info');
        return;
    }
    
    if (confirm('Очистить всю историю сканирований?')) {
        localStorage.removeItem('bjuHistory');
        loadHistory();
        showNotification('История очищена', 'success');
    }
}

// ===== ПОИСК ПРОДУКТА =====
function handleManualSearch() {
    if (!elements.manualBarcodeInput) return;
    
    const barcode = elements.manualBarcodeInput.value.trim();
    
    if (!barcode) {
        showNotification('Введите штрих-код', 'warning');
        elements.manualBarcodeInput.focus();
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
        
        // Пробуем все доступные API по очереди
        const product = await searchInAllAPIs(barcode);
        
        if (product) {
            displayProduct(product, barcode);
            showNotification('Продукт найден!', 'success');
        } else {
            // Если ни один API не нашёл продукт
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
            
            showNotification('Продукт не найден в базах данных', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        showNotification('Ошибка при поиске продукта', 'error');
    } finally {
        showLoading(false);
    }
}

// ===== ПОИСК ВО ВСЕХ API =====
async function searchInAllAPIs(barcode) {
    const apis = [
        searchOpenFoodFacts,   // Международная база
        searchUSDA,            // USDA база (США)
        searchNutritionix,     // Nutritionix API
        searchEdamam,          // Edamam API
        searchDemoData         // Демо-данные (если другие не сработали)
    ];
    
    // Пробуем каждый API по очереди
    for (const apiSearch of apis) {
        try {
            console.log(`Пробуем API: ${apiSearch.name}`);
            const product = await apiSearch(barcode);
            
            if (product && product.name) {
                console.log(`✅ Найдено в ${apiSearch.name}`);
                return product;
            }
        } catch (error) {
            console.log(`❌ ${apiSearch.name} не сработал:`, error.message);
            continue;
        }
    }
    
    return null;
}

// 1. Open Food Facts API (международная база)
async function searchOpenFoodFacts(barcode) {
    const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        {
            headers: {
                'User-Agent': 'NutritionScanner/2.0'
            },
            timeout: 5000
        }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
        const product = data.product;
        const nutrition = product.nutriments || {};
        
        return {
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
        };
    }
    
    return null;
}

// 2. USDA FoodData Central API (США)
async function searchUSDA(barcode) {
    // USDA не работает напрямую по штрих-коду, но есть поиск
    // Используем демо-данные для примера
    const usdaDemoProducts = {
        '0000000004011': {
            name: 'Apple',
            brand: 'USDA',
            calories: '52',
            protein: '0.3',
            fat: '0.2',
            carbs: '14',
            weight: '100g',
            source: 'USDA'
        },
        '0000000004012': {
            name: 'Banana',
            brand: 'USDA',
            calories: '89',
            protein: '1.1',
            fat: '0.3',
            carbs: '23',
            weight: '100g',
            source: 'USDA'
        }
    };
    
    return usdaDemoProducts[barcode] || null;
}

// 3. Nutritionix API (нужен API ключ)
async function searchNutritionix(barcode) {
    // Требуется регистрация на https://www.nutritionix.com/
    const API_KEY = ''; // Ваш API ключ
    const APP_ID = '';  // Ваш APP ID
    
    if (!API_KEY || !APP_ID) return null;
    
    try {
        const response = await fetch(
            `https://trackapi.nutritionix.com/v2/search/item?upc=${barcode}`,
            {
                headers: {
                    'x-app-id': APP_ID,
                    'x-app-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data.foods && data.foods.length > 0) {
            const food = data.foods[0];
            return {
                name: food.food_name,
                brand: food.brand_name || 'Не указано',
                calories: food.nf_calories || '0',
                protein: food.nf_protein || '0',
                fat: food.nf_total_fat || '0',
                carbs: food.nf_total_carbohydrate || '0',
                weight: food.serving_weight_grams ? `${food.serving_weight_grams}g` : 'Не указано',
                source: 'Nutritionix'
            };
        }
    } catch (error) {
        console.log('Nutritionix API error:', error);
    }
    
    return null;
}

// 4. Edamam API (нужен API ключ)
async function searchEdamam(barcode) {
    // Требуется регистрация на https://developer.edamam.com/
    const APP_ID = '';  // Ваш APP ID
    const APP_KEY = ''; // Ваш APP KEY
    
    if (!APP_ID || !APP_KEY) return null;
    
    try {
        // Edamam не поддерживает поиск по штрих-коду напрямую
        // Можно использовать поиск по названию, но для демо вернём null
        return null;
    } catch (error) {
        console.log('Edamam API error:', error);
        return null;
    }
}

// 5. Демо-данные (если другие API не сработали)
async function searchDemoData(barcode) {
    const demoProducts = {
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
            brand: 'Шоколадная фабрика',
            calories: '550',
            protein: '8',
            fat: '32',
            carbs: '55',
            weight: '100g',
            source: 'Демо-данные'
        }
    };
    
    return demoProducts[barcode] || null;
}

// ===== ОТОБРАЖЕНИЕ ПРОДУКТА =====
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
        sourceElement.innerHTML = `
            <span style="color: var(--info-color);">
                <i class="fas fa-database"></i> ${product.source || 'Неизвестный источник'}
            </span>
        `;
    }
    
    // Показываем результат
    if (elements.resultDiv) {
        elements.resultDiv.classList.remove('hidden');
        
        setTimeout(() => {
            elements.resultDiv.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 300);
    }
    
    // Отправка в Telegram
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            action: 'product_scanned',
            barcode: barcode,
            name: product.name,
            calories: product.calories,
            protein: product.protein,
            fat: product.fat,
            carbs: product.carbs,
            source: product.source,
            timestamp: new Date().toISOString()
        }));
    }
    
    playSuccessSound();
}

// ===== СКАНЕР ДЛЯ IOS И ANDROID =====
async function initScanner() {
    console.log('📷 Запуск сканера...');
    
    const isIOS = detectIOS();
    
    if (!checkCameraSupport()) {
        showNotification(
            isIOS ? 
            'Разрешите доступ к камере в настройках Safari' : 
            'Камера не поддерживается',
            'error'
        );
        return;
    }
    
    try {
        showLoading(true);
        
        // Для iOS используем специфичные настройки
        const constraints = isIOS ? 
            {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            } :
            {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };
        
        // Запрашиваем доступ к камере
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        currentStream = stream;
        isScanningActive = true;
        
        // Обновляем UI
        if (elements.startScannerBtn) elements.startScannerBtn.classList.add('hidden');
        if (elements.stopScannerBtn) elements.stopScannerBtn.classList.remove('hidden');
        
        // Создаём интерфейс сканера с учётом платформы
        createScannerUI(stream, isIOS);
        
        // Настраиваем видео
        const video = document.getElementById('cameraPreview');
        if (video) {
            video.srcObject = stream;
            video.setAttribute('playsinline', true); // Важно для iOS
            video.setAttribute('webkit-playsinline', true); // Для старых iOS
            
            // Ждём загрузки видео
            video.onloadedmetadata = () => {
                video.play().catch(e => console.log('Ошибка воспроизведения:', e));
            };
        }
        
        // Запускаем сканирование с учётом платформы
        await startPlatformSpecificScanning(video, isIOS);
        
        showNotification('Сканер активирован', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка камеры:', error);
        handleCameraError(error);
    } finally {
        showLoading(false);
    }
}

// Создание интерфейса сканера с учётом платформы
function createScannerUI(stream, isIOS) {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    // Для iOS используем более простой интерфейс
    scannerContainer.innerHTML = isIOS ? 
        // Интерфейс для iOS
        `
        <div class="camera-container" style="position: relative;">
            <video id="cameraPreview" autoplay playsinline muted 
                   style="width: 100%; height: 400px; object-fit: cover; border-radius: var(--radius);">
            </video>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                       width: 250px; height: 150px; border: 3px solid rgba(67, 97, 238, 0.8);
                       background: rgba(67, 97, 238, 0.1); pointer-events: none;">
                <div style="position: absolute; width: 100%; height: 2px; background: var(--accent-color);
                           animation: scan 2s ease-in-out infinite;"></div>
            </div>
            <div style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center;
                       color: white; background: rgba(0,0,0,0.7); padding: 8px; font-size: 13px;">
                Наведите на штрих-код
            </div>
        </div>
        <div style="text-align: center; margin-top: 15px;">
            <button id="toggleTorch" class="btn" style="background: var(--warning-color); color: white; margin: 5px;">
                <i class="fas fa-lightbulb"></i> Фонарик
            </button>
        </div>
        ` :
        // Интерфейс для Android/Desktop
        `
        <div class="camera-container">
            <video id="cameraPreview" autoplay playsinline muted 
                   style="width: 100%; height: auto; border-radius: var(--radius);">
            </video>
            <div class="scan-overlay">
                <div class="scan-line"></div>
            </div>
            <div class="scan-hint">
                Наведите камеру на штрих-код
            </div>
        </div>
        <div class="camera-controls" style="margin-top: 15px;">
            <button id="switchCamera" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); margin: 5px;">
                <i class="fas fa-sync-alt"></i> Камера
            </button>
            <button id="toggleTorch" class="btn" style="background: var(--warning-color); color: white; margin: 5px;">
                <i class="fas fa-lightbulb"></i> Фонарик
            </button>
        </div>
        `;
    
    // Настраиваем обработчики с задержкой для iOS
    setTimeout(() => {
        const video = document.getElementById('cameraPreview');
        if (!video) return;
        
        // Фонарик (работает на Android, на iOS ограниченно)
        const torchBtn = document.getElementById('toggleTorch');
        if (torchBtn) {
            torchBtn.addEventListener('click', () => toggleTorch(stream, video));
        }
        
        // Переключение камеры (только не для iOS)
        if (!isIOS) {
            const switchBtn = document.getElementById('switchCamera');
            if (switchBtn) {
                switchBtn.addEventListener('click', () => switchCamera(stream, video));
            }
        }
    }, 100);
}

// Запуск сканирования с учётом платформы
async function startPlatformSpecificScanning(video, isIOS) {
    if (!video) return;
    
    // Для iOS используем ZXing (более стабильно)
    // Для Android используем BarcodeDetector если доступен
    if (isIOS || typeof BarcodeDetector === 'undefined') {
        console.log('📚 Используем ZXing для сканирования');
        startZXingScanner(video);
    } else {
        console.log('📱 Используем BarcodeDetector API');
        startBarcodeDetectorScanner(video);
    }
}

// Сканирование через BarcodeDetector (Android/Chrome)
async function startBarcodeDetectorScanner(video) {
    try {
        // Создаём детектор
        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });
        
        // Функция сканирования
        async function scanFrame() {
            if (!isScanningActive || !video.videoWidth) return;
            
            try {
                const barcodes = await barcodeDetector.detect(video);
                
                if (barcodes.length > 0) {
                    const barcode = barcodes[0];
                    console.log('📸 Найден штрих-код:', barcode.rawValue);
                    
                    stopScanner();
                    searchProduct(barcode.rawValue);
                    playScanSound();
                    return;
                }
            } catch (error) {
                // Игнорируем ошибки распознавания
            }
            
            // Продолжаем сканирование
            if (isScanningActive) {
                requestAnimationFrame(scanFrame);
            }
        }
        
        // Запускаем сканирование
        scanFrame();
        
    } catch (error) {
        console.error('BarcodeDetector error:', error);
        // Возвращаемся к ZXing
        startZXingScanner(video);
    }
}

// Сканирование через ZXing (универсальное)
function startZXingScanner(video) {
    if (typeof ZXing === 'undefined') {
        console.error('ZXing не загружен');
        showNotification('Ошибка загрузки сканера', 'error');
        return;
    }
    
    codeReader = new ZXing.BrowserMultiFormatReader();
    
    // Создаём canvas для захвата кадра
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Функция сканирования
    function scanWithZXing() {
        if (!isScanningActive || !video.videoWidth) return;
        
        try {
            // Устанавливаем размеры
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Рисуем кадр
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
                        requestAnimationFrame(scanWithZXing);
                    }
                });
                
        } catch (error) {
            // Продолжаем при ошибке
            if (isScanningActive) {
                setTimeout(scanWithZXing, 100);
            }
        }
    }
    
    // Запускаем сканирование
    scanWithZXing();
}

// ===== УПРАВЛЕНИЕ ФОНАРИКОМ =====
async function toggleTorch(stream, video) {
    if (!stream || !video) return;
    
    try {
        const track = stream.getVideoTracks()[0];
        
        // Проверяем поддержку фонарика
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        
        if ('torch' in capabilities) {
            const torchBtn = document.getElementById('toggleTorch');
            
            try {
                // Получаем текущие ограничения
                const constraints = track.getConstraints();
                const currentTorch = constraints.torch || false;
                
                // Пробуем включить/выключить фонарик
                await track.applyConstraints({
                    advanced: [{ torch: !currentTorch }]
                });
                
                torchEnabled = !currentTorch;
                
                if (torchBtn) {
                    if (torchEnabled) {
                        torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Выкл.';
                        torchBtn.style.background = 'var(--danger-color)';
                        showNotification('Фонарик включён', 'success');
                    } else {
                        torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Вкл.';
                        torchBtn.style.background = 'var(--warning-color)';
                        showNotification('Фонарик выключен', 'info');
                    }
                }
                
            } catch (torchError) {
                console.log('Torch constraint error:', torchError);
                showNotification('Фонарик не поддерживается на этом устройстве', 'warning');
            }
            
        } else {
            // Альтернативный метод для устройств без поддержки torch
            showNotification('Фонарик не поддерживается на этом устройстве', 'warning');
            
            // Показываем альтернативу - увеличение яркости через CSS
            const torchBtn = document.getElementById('toggleTorch');
            if (torchBtn) {
                if (torchEnabled) {
                    video.style.filter = 'brightness(1)';
                    torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Вкл.';
                    torchBtn.style.background = 'var(--warning-color)';
                    torchEnabled = false;
                } else {
                    video.style.filter = 'brightness(1.5)';
                    torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Выкл.';
                    torchBtn.style.background = 'var(--danger-color)';
                    torchEnabled = true;
                }
            }
        }
        
    } catch (error) {
        console.error('Ошибка фонарика:', error);
        showNotification('Не удалось управлять фонариком', 'error');
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ КАМЕРЫ =====
async function switchCamera(oldStream, video) {
    if (!oldStream || !video) return;

    try {
        // Останавливаем старый поток
        oldStream.getTracks().forEach(track => track.stop());
        
        // Определяем текущую камеру
        const track = oldStream.getVideoTracks()[0];
        const settings = track.getSettings();
        currentFacingMode = settings.facingMode || 'environment';
        
        // Выбираем противоположную камеру
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        currentFacingMode = newFacingMode;
        
        // Запрашиваем новую камеру
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: newFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        currentStream = newStream;
