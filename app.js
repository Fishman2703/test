// ===== БАЗОВЫЕ ПЕРЕМЕННЫЕ =====
let currentProduct = null;
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
let isAndroid = /Android/.test(navigator.userAgent);

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Приложение загружено');
    console.log('Платформа:', isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop');
    
    initTheme();
    loadHistory();
    setupEventListeners();
    
    // Показываем подсказку для Android
    if (isAndroid) {
        setTimeout(() => {
            showNotification('На Android используйте "Сфотографировать код" или ручной ввод', 'info');
        }, 1500);
    }
});

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    // Основные кнопки
    document.getElementById('startScanner')?.addEventListener('click', showScanOptions);
    document.getElementById('stopScanner')?.addEventListener('click', hideScanner);
    document.getElementById('checkManual')?.addEventListener('click', handleManualSearch);
    document.getElementById('saveProduct')?.addEventListener('click', saveToHistory);
    document.getElementById('clearHistory')?.addEventListener('click', clearHistory);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('closeApp')?.addEventListener('click', closeApp);
    
    // Ручной ввод
    const manualInput = document.getElementById('manualBarcode');
    if (manualInput) {
        manualInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleManualSearch();
        });
        manualInput.focus();
    }
    
    // Тестовые коды
    document.querySelectorAll('.code-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const barcode = this.dataset.code;
            if (manualInput) {
                manualInput.value = barcode;
                handleManualSearch();
            }
        });
    });
}

// ===== ВЫБОР СПОСОБА СКАНИРОВАНИЯ =====
function showScanOptions() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    if (isAndroid) {
        // Для Android показываем вариант с фото
        scannerContainer.innerHTML = `
            <div class="section" style="text-align: center; padding: 30px 20px;">
                <h3 style="color: var(--text-primary); margin-bottom: 25px;">
                    <i class="fas fa-mobile-alt"></i> Сканирование на Android
                </h3>
                
                <div style="display: flex; flex-direction: column; gap: 15px; max-width: 300px; margin: 0 auto;">
                    <button onclick="startCameraScan()" class="btn btn-primary">
                        <i class="fas fa-camera"></i> Сфотографировать код
                    </button>
                    
                    <button onclick="startLiveCamera()" class="btn" style="background: var(--info-color); color: white;">
                        <i class="fas fa-video"></i> Попробовать Live-сканирование
                    </button>
                    
                    <button onclick="document.getElementById('manualBarcode').focus()" 
                            class="btn" style="background: var(--bg-tertiary); color: var(--text-primary);">
                        <i class="fas fa-keyboard"></i> Ввести код вручную
                    </button>
                </div>
                
                <div style="margin-top: 25px; padding: 15px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                    <p style="color: var(--text-secondary); font-size: 14px;">
                        <i class="fas fa-info-circle"></i> 
                        На Android Live-сканирование может не работать в Telegram.
                        <strong>Рекомендуем "Сфотографировать код"</strong>
                    </p>
                </div>
            </div>
        `;
    } else {
        // Для iOS и других - стандартный вариант
        scannerContainer.innerHTML = `
            <div class="section" style="text-align: center; padding: 30px 20px;">
                <h3 style="color: var(--text-primary); margin-bottom: 25px;">
                    <i class="fas fa-barcode"></i> Выберите способ сканирования
                </h3>
                
                <div style="display: flex; flex-direction: column; gap: 15px; max-width: 300px; margin: 0 auto;">
                    <button onclick="startLiveCamera()" class="btn btn-primary">
                        <i class="fas fa-camera"></i> Live-сканирование
                    </button>
                    
                    <button onclick="startCameraScan()" class="btn" style="background: var(--info-color); color: white;">
                        <i class="fas fa-camera"></i> Сфотографировать код
                    </button>
                    
                    <button onclick="document.getElementById('manualBarcode').focus()" 
                            class="btn" style="background: var(--bg-tertiary); color: var(--text-primary);">
                        <i class="fas fa-keyboard"></i> Ввести код вручную
                    </button>
                </div>
            </div>
        `;
    }
    
    // Обновляем UI кнопок
    document.getElementById('startScanner')?.classList.add('hidden');
    document.getElementById('stopScanner')?.classList.remove('hidden');
}

// ===== СКАНИРОВАНИЕ ЧЕРЕЗ ФОТОГРАФИЮ (РАБОТАЕТ НА ВСЕХ УСТРОЙСТВАХ) =====
function startCameraScan() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div class="section" style="text-align: center; padding: 30px 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 20px;">
                <i class="fas fa-camera"></i> Сфотографируйте штрих-код
            </h3>
            
            <div style="font-size: 48px; margin: 20px 0; color: var(--accent-color);">
                📷
            </div>
            
            <p style="color: var(--text-secondary); margin-bottom: 25px; line-height: 1.5;">
                1. Нажмите кнопку ниже<br>
                2. Сфотографируйте штрих-код<br>
                3. Загрузите фото
            </p>
            
            <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--radius-sm); margin: 20px 0;">
                <p style="color: var(--text-primary); font-weight: 600; margin-bottom: 10px;">
                    <i class="fas fa-lightbulb"></i> Советы для фото:
                </p>
                <ul style="text-align: left; color: var(--text-secondary); padding-left: 20px; font-size: 14px;">
                    <li>Хорошее освещение</li>
                    <li>Задняя камера телефона</li>
                    <li>Параллельно штрих-коду</li>
                    <li>Без бликов и теней</li>
                </ul>
            </div>
            
            <div style="margin: 20px 0;">
                <input type="file" id="cameraFileInput" accept="image/*" capture="environment" 
                       style="display: none;">
                <button id="takePhotoBtn" class="btn btn-primary" style="margin: 5px;">
                    <i class="fas fa-camera"></i> Сделать фото
                </button>
                <button id="chooseFileBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); margin: 5px;">
                    <i class="fas fa-folder-open"></i> Выбрать из галереи
                </button>
            </div>
            
            <div id="photoPreview" style="margin-top: 20px;"></div>
            <div id="scanResult" style="margin-top: 10px;"></div>
        </div>
    `;
    
    // Настраиваем обработчики
    setTimeout(() => {
        const fileInput = document.getElementById('cameraFileInput');
        const takePhotoBtn = document.getElementById('takePhotoBtn');
        const chooseFileBtn = document.getElementById('chooseFileBtn');
        
        if (takePhotoBtn) {
            takePhotoBtn.addEventListener('click', () => {
                if (fileInput) {
                    fileInput.setAttribute('capture', 'environment');
                    fileInput.click();
                }
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
                    processPhotoForBarcode(file);
                }
            });
        }
    }, 100);
}

// ===== ОБРАБОТКА ФОТОГРАФИИ =====
async function processPhotoForBarcode(file) {
    const preview = document.getElementById('photoPreview');
    const resultDiv = document.getElementById('scanResult');
    
    if (!preview || !resultDiv) return;
    
    preview.innerHTML = '<p style="color: var(--text-secondary);">⏳ Загружаем фото...</p>';
    resultDiv.innerHTML = '';
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = async function() {
            // Показываем превью
            preview.innerHTML = `
                <img src="${img.src}" style="max-width: 300px; border-radius: var(--radius); border: 2px solid var(--border-color); margin-bottom: 15px;">
                <p style="color: var(--text-secondary);">🔍 Анализируем изображение...</p>
            `;
            
            try {
                // Пробуем распознать через разные методы
                const barcode = await scanBarcodeFromImage(img);
                
                if (barcode) {
                    resultDiv.innerHTML = `
                        <div style="background: var(--success-color); color: white; padding: 15px; border-radius: var(--radius-sm); margin-top: 15px;">
                            <div style="font-size: 18px; margin-bottom: 5px;">
                                <i class="fas fa-check-circle"></i> Штрих-код найден!
                            </div>
                            <div style="font-size: 20px; font-weight: bold; margin: 10px 0;">
                                ${barcode}
                            </div>
                            <button onclick="searchProduct('${barcode}')" class="btn" style="background: white; color: var(--success-color); margin-top: 10px;">
                                <i class="fas fa-search"></i> Найти продукт
                            </button>
                        </div>
                    `;
                    
                    // Автоматически ищем продукт через 1 секунду
                    setTimeout(() => {
                        searchProduct(barcode);
                    }, 1000);
                    
                } else {
                    resultDiv.innerHTML = `
                        <div style="background: var(--warning-color); color: white; padding: 15px; border-radius: var(--radius-sm); margin-top: 15px;">
                            <div style="font-size: 18px; margin-bottom: 5px;">
                                <i class="fas fa-exclamation-triangle"></i> Штрих-код не найден
                            </div>
                            <p style="font-size: 14px; margin: 10px 0;">
                                Попробуйте:
                            </p>
                            <ul style="text-align: left; font-size: 13px; padding-left: 20px; margin: 10px 0;">
                                <li>Сфотографировать снова</li>
                                <li>Улучшить освещение</li>
                                <li>Использовать ручной ввод</li>
                            </ul>
                            <button onclick="startCameraScan()" class="btn" style="background: white; color: var(--warning-color); margin: 5px;">
                                <i class="fas fa-redo"></i> Попробовать снова
                            </button>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Ошибка обработки фото:', error);
                resultDiv.innerHTML = `
                    <div style="background: var(--danger-color); color: white; padding: 15px; border-radius: var(--radius-sm); margin-top: 15px;">
                        <i class="fas fa-times-circle"></i> Ошибка обработки
                    </div>
                `;
            }
        };
    };
    
    reader.readAsDataURL(file);
}

// ===== РАСПОЗНАВАНИЕ ШТРИХ-КОДА С ИЗОБРАЖЕНИЯ =====
async function scanBarcodeFromImage(img) {
    console.log('🔍 Пробуем распознать штрих-код с фото...');
    
    // Пробуем BarcodeDetector API если доступен
    if (typeof BarcodeDetector !== 'undefined') {
        try {
            const detector = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'datamatrix']
            });
            
            const barcodes = await detector.detect(img);
            
            if (barcodes.length > 0) {
                console.log('✅ BarcodeDetector нашел:', barcodes[0].rawValue);
                return barcodes[0].rawValue;
            }
        } catch (error) {
            console.log('BarcodeDetector не сработал:', error);
        }
    }
    
    // Пробуем ZXing
    if (typeof ZXing !== 'undefined') {
        try {
            const codeReader = new ZXing.BrowserMultiFormatReader();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const result = await codeReader.decodeFromCanvas(canvas);
            
            if (result && result.text) {
                console.log('✅ ZXing нашел:', result.text);
                return result.text;
            }
        } catch (error) {
            console.log('ZXing не сработал:', error);
        }
    }
    
    // Загружаем QuaggaJS как последний вариант
    try {
        await loadQuaggaJS();
        
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            Quagga.decodeSingle({
                src: canvas.toDataURL(),
                numOfWorkers: 0,
                decoder: {
                    readers: ['ean_reader', 'ean_8_reader', 'code_128_reader']
                }
            }, function(result) {
                if (result && result.codeResult) {
                    console.log('✅ Quagga нашел:', result.codeResult.code);
                    resolve(result.codeResult.code);
                } else {
                    resolve(null);
                }
            });
        });
    } catch (error) {
        console.log('QuaggaJS не сработал:', error);
    }
    
    return null;
}

function loadQuaggaJS() {
    return new Promise((resolve, reject) => {
        if (typeof Quagga !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
        
        script.onload = resolve;
        script.onerror = reject;
        
        document.head.appendChild(script);
    });
}

// ===== LIVE-СКАНИРОВАНИЕ (пробуем, но не надеемся на Android) =====
async function startLiveCamera() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    // Предупреждение для Android
    if (isAndroid) {
        if (!confirm('Live-сканирование может не работать в Telegram на Android. Продолжить?')) {
            showScanOptions();
            return;
        }
    }
    
    try {
        scannerContainer.innerHTML = `
            <div style="text-align: center; padding: 30px 20px;">
                <div class="loading" style="margin: 0 auto 20px;"></div>
                <p style="color: var(--text-primary);">Запуск Live-сканирования...</p>
                <p style="color: var(--text-secondary); font-size: 14px; margin-top: 10px;">
                    Разрешите доступ к камере
                </p>
            </div>
        `;
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment'
            },
            audio: false
        });
        
        scannerContainer.innerHTML = `
            <div style="position: relative; background: #000; border-radius: 10px; overflow: hidden;">
                <video id="liveCameraPreview" autoplay playsinline muted 
                       style="width: 100%; height: 300px; object-fit: cover;"></video>
                
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                           width: 250px; height: 150px; border: 3px solid #00ff00; 
                           background: rgba(0, 255, 0, 0.1);"></div>
                
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                           width: 250px; height: 3px; background: #00ff00; 
                           animation: scanMove 2s linear infinite;"></div>
                
                <style>
                    @keyframes scanMove {
                        0% { top: 50%; }
                        50% { top: calc(50% + 150px); }
                        100% { top: 50%; }
                    }
                </style>
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="stopLiveCamera()" class="btn" style="background: #ff4757; color: white;">
                    <i class="fas fa-stop"></i> Остановить
                </button>
            </div>
        `;
        
        const video = document.getElementById('liveCameraPreview');
        video.srcObject = stream;
        
        // Пробуем Live-сканирование
        attemptLiveScanning(video);
        
        showNotification('Live-сканирование запущено', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка Live-камеры:', error);
        showNotification('Live-сканирование не доступно. Используйте "Сфотографировать код"', 'error');
        showScanOptions();
    }
}

function attemptLiveScanning(video) {
    // Пробуем BarcodeDetector для Live-сканирования
    if (typeof BarcodeDetector !== 'undefined') {
        const detector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
        });
        
        function scanLive() {
            if (!video || !video.srcObject) return;
            
            detector.detect(video)
                .then(barcodes => {
                    if (barcodes.length > 0) {
                        const barcode = barcodes[0].rawValue;
                        console.log('🎉 Live-сканирование нашло:', barcode);
                        stopLiveCamera();
                        searchProduct(barcode);
                        return;
                    }
                    setTimeout(scanLive, 300);
                })
                .catch(() => {
                    setTimeout(scanLive, 300);
                });
        }
        
        scanLive();
    } else {
        showNotification('Live-сканирование не поддерживается', 'warning');
        setTimeout(() => {
            stopLiveCamera();
            showScanOptions();
        }, 2000);
    }
}

function stopLiveCamera() {
    const video = document.getElementById('liveCameraPreview');
    if (video && video.srcObject) {
        const stream = video.srcObject;
        stream.getTracks().forEach(track => track.stop());
    }
    hideScanner();
}

function hideScanner() {
    document.getElementById('startScanner')?.classList.remove('hidden');
    document.getElementById('stopScanner')?.classList.add('hidden');
    
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
}

// ===== ПОИСК ПРОДУКТА =====
function handleManualSearch() {
    const input = document.getElementById('manualBarcode');
    const barcode = input?.value.trim();
    
    if (!barcode) {
        showNotification('Введите штрих-код', 'warning');
        input?.focus();
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
                displayProduct(testProducts[barcode], barcode);
                showLoading(false);
            }, 500);
            return;
        }
        
        // Пробуем API
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.status === 1 && data.product) {
                    const product = data.product;
                    const nutrition = product.nutriments || {};
                    
                    displayProduct({
                        name: product.product_name || 'Продукт',
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
        
        // Не нашли
        displayProduct({
            name: `Продукт ${barcode}`,
            brand: 'Неизвестно',
            calories: '0',
            protein: '0',
            fat: '0',
            carbs: '0',
            weight: 'Не указано',
            source: 'Не найдено'
        }, barcode);
        
    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        showNotification('Ошибка поиска', 'error');
    } finally {
        showLoading(false);
    }
}

function displayProduct(product, barcode) {
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
    
    // Источник
    const sourceEl = document.getElementById('productStatus');
    if (sourceEl) {
        sourceEl.innerHTML = product.source === 'Демо' ? 
            '<span style="color: var(--warning-color);"><i class="fas fa-flask"></i> Демо</span>' :
            `<span style="color: var(--info-color);"><i class="fas fa-database"></i> ${product.source}</span>`;
    }
    
    // Показываем результат
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        resultDiv.classList.remove('hidden');
        setTimeout(() => resultDiv.scrollIntoView({ behavior: 'smooth' }), 300);
    }
    
    showNotification('Продукт найден!', 'success');
    saveToHistory();
}

// ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====
function initTheme() {
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
    
    showNotification(`Тема: ${newTheme === 'dark' ? 'тёмная' : 'светлая'}`, 'info');
}

function showLoading(show) {
    const startBtn = document.getElementById('startScanner');
    const checkBtn = document.getElementById('checkManual');
    
    [startBtn, checkBtn].forEach(btn => {
        if (btn) {
            if (show) {
                btn.disabled = true;
                btn.innerHTML = btn.id === 'checkManual' ? 
                    '<i class="fas fa-spinner fa-spin"></i> Поиск...' : 
                    '<i class="fas fa-spinner fa-spin"></i>';
            } else {
                btn.disabled = false;
                btn.innerHTML = btn.id === 'checkManual' ? 
                    '<i class="fas fa-search"></i> Найти' : 
                    '🎥 Включить сканер';
            }
        }
    });
}

function closeApp() {
    if (window.Telegram?.WebApp?.close) {
        window.Telegram.WebApp.close();
    }
}

// ===== ИСТОРИЯ =====
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
    if (!currentProduct) return;
    
    const history = JSON.parse(localStorage.getItem('bjuHistory')) || [];
    
    const existingIndex = history.findIndex(item => item.barcode === currentProduct.barcode);
    
    if (existingIndex !== -1) {
        history[existingIndex] = currentProduct;
    } else {
        history.push(currentProduct);
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
    
    if (confirm(`Очистить историю (${history.length} записей)?`)) {
        localStorage.removeItem('bjuHistory');
        loadHistory();
        showNotification('История очищена', 'success');
    }
}

// ===== УВЕДОМЛЕНИЯ =====
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
window.startCameraScan = startCameraScan;
window.startLiveCamera = startLiveCamera;
window.stopLiveCamera = stopLiveCamera;
window.searchProduct = searchProduct;

// Прогресс-бар
window.addEventListener('scroll', function() {
    const progress = document.getElementById('progressFill');
    if (!progress) return;
    
    const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    progress.style.width = Math.min(scrolled, 100) + '%';
});

// Тестовые функции
window.testPhotoScan = function() {
    console.log('🧪 Тестируем сканирование с фото');
    // Создаем тестовое изображение с штрих-кодом
    searchProduct('3017620422003');
};

window.getPlatformInfo = function() {
    return {
        isAndroid: isAndroid,
        isIOS: isIOS,
        userAgent: navigator.userAgent,
        supportsBarcodeDetector: typeof BarcodeDetector !== 'undefined'
    };
};