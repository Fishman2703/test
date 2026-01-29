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
let scanMode = 'barcode'; // 'barcode' или 'honest_sign'

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
    
    // Инициализация сканера
    initScannerManager();
});

// ===== МЕНЕДЖЕР СКАНЕРА =====
function initScannerManager() {
    // Проверяем устройства
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    
    console.log(`📱 Устройство: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Другое'}`);
    
    // Для iOS добавляем специфичные классы
    if (isIOS) {
        document.body.classList.add('ios-device');
        console.log('ℹ️ iOS устройство - используем специфичные настройки');
    }
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    // Основные кнопки
    if (elements.startScannerBtn) {
        elements.startScannerBtn.addEventListener('click', () => {
            showScanModeSelector();
        });
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

// ===== ВЫБОР РЕЖИМА СКАНИРОВАНИЯ =====
function showScanModeSelector() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div class="section" style="text-align: center; padding: 30px 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 25px;">
                <i class="fas fa-barcode"></i> Выберите режим сканирования
            </h3>
            
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 300px; margin: 0 auto;">
                <button id="scanBarcodeBtn" class="btn btn-primary" style="justify-content: flex-start; text-align: left;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 24px;">📦</div>
                        <div>
                            <div style="font-weight: 600;">Штрих-коды (EAN/UPC)</div>
                            <div style="font-size: 13px; opacity: 0.8;">Продукты питания, товары</div>
                        </div>
                    </div>
                </button>
                
                <button id="scanHonestSignBtn" class="btn" style="background: var(--info-color); color: white; justify-content: flex-start; text-align: left;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 24px;">🏷️</div>
                        <div>
                            <div style="font-weight: 600;">Честный знак (DataMatrix)</div>
                            <div style="font-size: 13px; opacity: 0.8;">Маркировка товаров в РФ</div>
                        </div>
                    </div>
                </button>
                
                <button id="scanQrBtn" class="btn" style="background: var(--success-color); color: white; justify-content: flex-start; text-align: left;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 24px;">🔳</div>
                        <div>
                            <div style="font-weight: 600;">QR-коды</div>
                            <div style="font-size: 13px; opacity: 0.8;">Ссылки, контакты, информация</div>
                        </div>
                    </div>
                </button>
            </div>
            
            <div style="margin-top: 25px; padding: 15px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 10px;">
                    <i class="fas fa-info-circle"></i> Что сканировать?
                </p>
                <ul style="text-align: left; color: var(--text-secondary); font-size: 13px; padding-left: 20px;">
                    <li><strong>Штрих-код</strong> - на упаковках продуктов (13 цифр)</li>
                    <li><strong>Честный знак</strong> - квадратный код на маркированных товарах</li>
                    <li><strong>QR-код</strong> - квадратный код с информацией</li>
                </ul>
            </div>
        </div>
    `;
    
    // Обработчики выбора режима
    setTimeout(() => {
        document.getElementById('scanBarcodeBtn').addEventListener('click', () => {
            scanMode = 'barcode';
            initScanner();
        });
        
        document.getElementById('scanHonestSignBtn').addEventListener('click', () => {
            scanMode = 'honest_sign';
            initScanner();
        });
        
        document.getElementById('scanQrBtn').addEventListener('click', () => {
            scanMode = 'qr';
            initScanner();
        });
    }, 100);
}

// ===== ОСНОВНАЯ ФУНКЦИЯ СКАНЕРА (ИСПРАВЛЕНА ДЛЯ iOS) =====
async function initScanner() {
    console.log(`📷 Запуск сканера в режиме: ${scanMode}`);
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        // Для iOS используем специальный подход
        await initScannerIOS();
    } else {
        await initScannerStandard();
    }
}

// ===== СКАНЕР ДЛЯ iOS =====
async function initScannerIOS() {
    console.log('🍎 Используем iOS-совместимый сканер');
    
    try {
        showLoading(true);
        
        // 1. Сначала показываем инструкцию для iOS
        const scannerContainer = document.getElementById('qr-reader');
        scannerContainer.innerHTML = `
            <div class="section" style="text-align: center; padding: 30px 20px;">
                <h3 style="color: var(--text-primary); margin-bottom: 20px;">
                    <i class="fas fa-camera"></i> Доступ к камере
                </h3>
                
                <div style="font-size: 48px; margin: 20px 0; color: var(--accent-color);">
                    📷
                </div>
                
                <p style="color: var(--text-secondary); margin-bottom: 25px; line-height: 1.5;">
                    Для сканирования необходимо разрешить доступ к камере.
                    <br>
                    <strong>Всплывающее окно запроса появится выше.</strong>
                </p>
                
                <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--radius-sm); margin: 20px 0;">
                    <p style="color: var(--text-primary); font-weight: 600; margin-bottom: 10px;">
                        <i class="fas fa-mobile-alt"></i> Инструкция для iOS:
                    </p>
                    <ol style="text-align: left; color: var(--text-secondary); padding-left: 20px; font-size: 14px;">
                        <li>Нажмите "Разрешить" во всплывающем окне</li>
                        <li>Если окно не появилось, обновите страницу</li>
                        <li>Убедитесь, что Safari имеет доступ к камере</li>
                        <li>Используйте заднюю камеру для лучшего качества</li>
                    </ol>
                </div>
                
                <button id="continueScanBtn" class="btn btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-play"></i> Продолжить
                </button>
                
                <button id="useWithoutCameraBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); margin-top: 10px;">
                    <i class="fas fa-keyboard"></i> Использовать ручной ввод
                </button>
            </div>
        `;
        
        // Обработчики для iOS
        setTimeout(() => {
            document.getElementById('continueScanBtn').addEventListener('click', async () => {
                await startIOSCamera();
            });
            
            document.getElementById('useWithoutCameraBtn').addEventListener('click', () => {
                elements.manualBarcodeInput.focus();
                showNotification('Используйте ручной ввод или загрузите фото', 'info');
            });
        }, 100);
        
    } catch (error) {
        console.error('Ошибка инициализации iOS:', error);
        showNotification('Ошибка доступа к камере на iOS', 'error');
    } finally {
        showLoading(false);
    }
}

// Запуск камеры на iOS
async function startIOSCamera() {
    try {
        // Важные настройки для iOS
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: false
        };
        
        // iOS требует HTTPS и пользовательского взаимодействия
        console.log('📱 Запрашиваем доступ к камере на iOS...');
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('✅ Камера на iOS успешно запущена');
        
        currentStream = stream;
        isScanningActive = true;
        
        // Обновляем UI
        if (elements.startScannerBtn) elements.startScannerBtn.classList.add('hidden');
        if (elements.stopScannerBtn) elements.stopScannerBtn.classList.remove('hidden');
        
        // Создаём интерфейс сканера для iOS
        createIOSScannerUI(stream);
        
        // Настраиваем видео
        const video = document.getElementById('cameraPreview');
        if (video) {
            video.srcObject = stream;
            
            // Критически важные атрибуты для iOS
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            video.setAttribute('muted', 'true');
            video.setAttribute('autoplay', 'true');
            
            // Ждём готовности видео
            video.onloadedmetadata = () => {
                console.log('🎥 Видео метаданные загружены');
                video.play()
                    .then(() => {
                        console.log('▶️ Видео воспроизводится');
                        showNotification('Камера активирована', 'success');
                    })
                    .catch(e => {
                        console.error('Ошибка воспроизведения:', e);
                        showNotification('Ошибка запуска камеры', 'error');
                    });
            };
            
            video.onerror = (e) => {
                console.error('Ошибка видео:', e);
                showNotification('Ошибка работы камеры', 'error');
            };
        }
        
        // Запускаем сканирование
        startIOSScanning(video);
        
    } catch (error) {
        console.error('❌ Ошибка камеры iOS:', error.name, error.message);
        
        let errorMessage = 'Не удалось получить доступ к камере. ';
        
        switch(error.name) {
            case 'NotAllowedError':
                errorMessage += 'Вы отклонили запрос на доступ к камере. ';
                errorMessage += 'Разрешите доступ в настройках Safari: Настройки > Safari > Камера.';
                break;
            case 'NotFoundError':
                errorMessage += 'Камера не найдена на устройстве.';
                break;
            case 'NotSupportedError':
                errorMessage += 'Ваша версия iOS не поддерживает камеру в браузере.';
                break;
            case 'NotReadableError':
                errorMessage += 'Камера уже используется другим приложением.';
                break;
            default:
                errorMessage += `Ошибка: ${error.message}`;
        }
        
        showNotification(errorMessage, 'error');
        
        // Предлагаем альтернативы
        showIOSAlternatives();
    }
}

// Создание интерфейса сканера для iOS
function createIOSScannerUI(stream) {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div class="camera-container" style="position: relative; background: #000; border-radius: var(--radius); overflow: hidden;">
            <video id="cameraPreview" style="width: 100%; height: 400px; object-fit: cover;"></video>
            
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                       width: 280px; height: 180px; border: 3px solid rgba(67, 97, 238, 0.8);
                       background: rgba(67, 97, 238, 0.1); pointer-events: none; border-radius: 10px;">
                <div style="position: absolute; width: 100%; height: 3px; background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
                           top: 0; animation: scan 2s ease-in-out infinite;"></div>
            </div>
            
            <div style="position: absolute; bottom: 15px; left: 0; right: 0; text-align: center;">
                <div style="display: inline-block; background: rgba(0,0,0,0.7); color: white; 
                           padding: 8px 16px; border-radius: 20px; font-size: 14px;">
                    <i class="fas fa-barcode"></i> Режим: ${getScanModeName()}
                </div>
            </div>
            
            <div style="position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.7); 
                       color: white; padding: 6px 12px; border-radius: 20px; font-size: 13px;">
                <i class="fas fa-mobile-alt"></i> iOS
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 15px;">
            <button id="iosTorchBtn" class="btn" style="background: var(--warning-color); color: white; margin: 5px;">
                <i class="fas fa-lightbulb"></i> Вкл. подсветку
            </button>
            <button id="iosHelpBtn" class="btn" style="background: var(--info-color); color: white; margin: 5px;">
                <i class="fas fa-question-circle"></i> Помощь
            </button>
        </div>
        
        <div id="iosTips" style="display: none; margin-top: 15px; padding: 15px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
            <p style="color: var(--text-primary); font-weight: 600; margin-bottom: 10px;">
                <i class="fas fa-lightbulb"></i> Советы для iOS:
            </p>
            <ul style="text-align: left; color: var(--text-secondary); font-size: 13px; padding-left: 20px;">
                <li>Держите устройство на расстоянии 10-20 см от кода</li>
                <li>Убедитесь, что код хорошо освещён</li>
                <li>Избегайте бликов и отражений</li>
                <li>Для "Честного знака" - наведите на квадратный код</li>
            </ul>
        </div>
    `;
    
    // Обработчики для iOS
    setTimeout(() => {
        const video = document.getElementById('cameraPreview');
        if (!video) return;
        
        // Кнопка подсветки (имитация фонарика для iOS)
        const torchBtn = document.getElementById('iosTorchBtn');
        if (torchBtn) {
            torchBtn.addEventListener('click', () => {
                toggleIOSFlashlight(video);
            });
        }
        
        // Кнопка помощи
        const helpBtn = document.getElementById('iosHelpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                const tips = document.getElementById('iosTips');
                if (tips) {
                    tips.style.display = tips.style.display === 'none' ? 'block' : 'none';
                }
            });
        }
    }, 100);
}

// Подсветка для iOS (имитация фонарика)
function toggleIOSFlashlight(video) {
    const torchBtn = document.getElementById('iosTorchBtn');
    
    if (torchEnabled) {
        // Выключаем подсветку
        video.style.filter = 'brightness(1) contrast(1)';
        torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Вкл. подсветку';
        torchBtn.style.background = 'var(--warning-color)';
        torchEnabled = false;
        showNotification('Подсветка выключена', 'info');
    } else {
        // Включаем подсветку
        video.style.filter = 'brightness(1.8) contrast(1.2)';
        torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Выкл. подсветку';
        torchBtn.style.background = 'var(--danger-color)';
        torchEnabled = true;
        showNotification('Подсветка включена', 'success');
    }
}

// Сканирование на iOS
function startIOSScanning(video) {
    if (!video) return;
    
    console.log('🔍 Запуск сканирования на iOS...');
    
    // Используем ZXing для iOS (наиболее стабильно)
    if (typeof ZXing === 'undefined') {
        showNotification('Ошибка загрузки сканера', 'error');
        return;
    }
    
    codeReader = new ZXing.BrowserMultiFormatReader();
    
    // Определяем форматы для сканирования
    const formats = getScanFormats();
    codeReader.hints = new Map([
        [ZXing.DecodeHintType.POSSIBLE_FORMATS, formats],
        [ZXing.DecodeHintType.TRY_HARDER, true]
    ]);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    function scanIOS() {
        if (!isScanningActive || !video.videoWidth) {
            return;
        }
        
        try {
            // Для iOS используем меньший размер canvas для производительности
            canvas.width = Math.min(video.videoWidth, 800);
            canvas.height = Math.min(video.videoHeight, 600);
            
            // Рисуем кадр с центрированием
            context.drawImage(
                video, 
                0, 0, video.videoWidth, video.videoHeight,
                0, 0, canvas.width, canvas.height
            );
            
            // Пытаемся распознать код
            codeReader.decodeFromCanvas(canvas)
                .then(result => {
                    console.log(`✅ iOS распознал код:`, result.text, `Формат:`, result.format);
                    
                    // Обрабатываем результат в зависимости от режима
                    handleScanResult(result.text, result.format);
                    
                    // Останавливаем сканирование
                    stopScanner();
                    
                    // Воспроизводим звук
                    playScanSound();
                })
                .catch(error => {
                    // Это нормально - код не найден, продолжаем сканирование
                    if (isScanningActive) {
                        requestAnimationFrame(scanIOS);
                    }
                });
                
        } catch (error) {
            console.log('Ошибка сканирования iOS:', error);
            if (isScanningActive) {
                setTimeout(scanIOS, 100);
            }
        }
    }
    
    // Запускаем сканирование
    scanIOS();
}

// ===== СКАНЕР ДЛЯ ANDROID И DESKTOP =====
async function initScannerStandard() {
    console.log('📱 Используем стандартный сканер');
    
    try {
        showLoading(true);
        
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: false
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        currentStream = stream;
        isScanningActive = true;
        
        // Обновляем UI
        if (elements.startScannerBtn) elements.startScannerBtn.classList.add('hidden');
        if (elements.stopScannerBtn) elements.stopScannerBtn.classList.remove('hidden');
        
        // Создаём интерфейс сканера
        createStandardScannerUI(stream);
        
        // Настраиваем видео
        const video = document.getElementById('cameraPreview');
        if (video) {
            video.srcObject = stream;
            
            video.onloadedmetadata = () => {
                video.play().catch(e => console.log('Ошибка воспроизведения:', e));
            };
        }
        
        // Запускаем сканирование
        startStandardScanning(video);
        
        showNotification(`Сканирование ${getScanModeName()}`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка камеры:', error);
        handleCameraError(error);
    } finally {
        showLoading(false);
    }
}

function createStandardScannerUI(stream) {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div class="camera-container">
            <video id="cameraPreview" autoplay playsinline muted 
                   style="width: 100%; height: auto; border-radius: var(--radius);">
            </video>
            <div class="scan-overlay">
                <div class="scan-line"></div>
                <div style="position: absolute; top: -30px; left: 10px; 
                           color: white; font-size: 12px; background: rgba(0,0,0,0.7); 
                           padding: 4px 8px; border-radius: 4px;">
                    <i class="fas fa-${getScanModeIcon()}"></i> ${getScanModeName()}
                </div>
            </div>
            <div class="scan-hint">
                ${getScanModeHint()}
            </div>
        </div>
        <div class="camera-controls" style="margin-top: 15px;">
            <button id="switchCameraBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); margin: 5px;">
                <i class="fas fa-sync-alt"></i> Камера
            </button>
            <button id="toggleTorchBtn" class="btn" style="background: var(--warning-color); color: white; margin: 5px;">
                <i class="fas fa-lightbulb"></i> Фонарик
            </button>
            <button id="changeModeBtn" class="btn" style="background: var(--info-color); color: white; margin: 5px;">
                <i class="fas fa-exchange-alt"></i> Режим
            </button>
        </div>
    `;
    
    // Обработчики
    setTimeout(() => {
        const video = document.getElementById('cameraPreview');
        if (!video) return;
        
        // Переключение камеры
        const switchBtn = document.getElementById('switchCameraBtn');
        if (switchBtn) {
            switchBtn.addEventListener('click', () => switchCamera(stream, video));
        }
        
        // Фонарик
        const torchBtn = document.getElementById('toggleTorchBtn');
        if (torchBtn) {
            torchBtn.addEventListener('click', () => toggleTorch(stream, video));
        }
        
        // Смена режима
        const modeBtn = document.getElementById('changeModeBtn');
        if (modeBtn) {
            modeBtn.addEventListener('click', () => {
                stopScanner();
                showScanModeSelector();
            });
        }
    }, 100);
}

function startStandardScanning(video) {
    if (!video) return;
    
    // Пробуем BarcodeDetector если доступен
    if (typeof BarcodeDetector !== 'undefined') {
        startBarcodeDetectorScanning(video);
    } else {
        // Иначе используем ZXing
        startZXingScanning(video);
    }
}

function startBarcodeDetectorScanning(video) {
    try {
        const formats = getBarcodeDetectorFormats();
        const barcodeDetector = new BarcodeDetector({ formats });
        
        async function scanFrame() {
            if (!isScanningActive || !video.videoWidth) return;
            
            try {
                const barcodes = await barcodeDetector.detect(video);
                
                if (barcodes.length > 0) {
                    const barcode = barcodes[0];
                    console.log(`✅ Распознан код:`, barcode.rawValue, `Формат:`, barcode.format);
                    
                    handleScanResult(barcode.rawValue, barcode.format);
                    stopScanner();
                    playScanSound();
                    return;
                }
            } catch (error) {
                // Игнорируем ошибки распознавания
            }
            
            if (isScanningActive) {
                requestAnimationFrame(scanFrame);
            }
        }
        
        scanFrame();
        
    } catch (error) {
        console.error('BarcodeDetector error:', error);
        startZXingScanning(video);
    }
}

function startZXingScanning(video) {
    if (typeof ZXing === 'undefined') {
        showNotification('Ошибка загрузки сканера', 'error');
        return;
    }
    
    codeReader = new ZXing.BrowserMultiFormatReader();
    const formats = getScanFormats();
    codeReader.hints = new Map([
        [ZXing.DecodeHintType.POSSIBLE_FORMATS, formats],
        [ZXing.DecodeHintType.TRY_HARDER, true]
    ]);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    function scanWithZXing() {
        if (!isScanningActive || !video.videoWidth) return;
        
        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            codeReader.decodeFromCanvas(canvas)
                .then(result => {
                    console.log(`✅ ZXing распознал:`, result.text, `Формат:`, result.format);
                    handleScanResult(result.text, result.format);
                    stopScanner();
                    playScanSound();
                })
                .catch(() => {
                    if (isScanningActive) {
                        requestAnimationFrame(scanWithZXing);
                    }
                });
                
        } catch (error) {
            if (isScanningActive) {
                setTimeout(scanWithZXing, 100);
            }
        }
    }
    
    scanWithZXing();
}

// ===== ОБРАБОТКА РЕЗУЛЬТАТОВ СКАНИРОВАНИЯ =====
function handleScanResult(code, format) {
    console.log(`📊 Обработка результата: ${code}, Формат: ${format}, Режим: ${scanMode}`);
    
    // Определяем тип кода по формату
    const detectedType = detectCodeType(code, format);
    
    // Обрабатываем в зависимости от типа кода
    switch(detectedType) {
        case 'ean13':
        case 'ean8':
        case 'upca':
        case 'upce':
            // Штрих-код продукта
            searchProduct(code);
            break;
            
        case 'datamatrix':
        case 'qr_code':
            // Честный знак или QR-код
            processDataMatrixCode(code);
            break;
            
        case 'code128':
        case 'code39':
            // Другие типы штрих-кодов
            searchProduct(code);
            break;
            
        default:
            // Неизвестный формат
            showNotification(`Распознан код: ${code}`, 'info');
            // Пробуем поискать как штрих-код
            if (code.length >= 8 && code.length <= 14 && /^\d+$/.test(code)) {
                searchProduct(code);
            } else {
                showResultPanel(code, 'Неизвестный формат кода');
            }
    }
}

// Определение типа кода
function detectCodeType(code, format) {
    // Если формат передан напрямую
    if (format) {
        return format.toLowerCase();
    }
    
    // Определяем по длине и содержанию
    if (/^01\d{14}21[A-Za-z0-9]{13}$/.test(code)) {
        return 'datamatrix'; // Честный знак
    } else if (code.length === 13 && /^\d+$/.test(code)) {
        return 'ean13';
    } else if (code.length === 8 && /^\d+$/.test(code)) {
        return 'ean8';
    } else if (code.length === 12 && /^\d+$/.test(code)) {
        return 'upca';
    } else if (code.startsWith('http://') || code.startsWith('https://')) {
        return 'qr_code';
    } else if (code.includes('gs1:') || code.includes('01=')) {
        return 'datamatrix';
    }
    
    return 'unknown';
}

// Обработка DataMatrix кода (Честный знак)
function processDataMatrixCode(code) {
    console.log('🏷️ Обработка DataMatrix кода (Честный знак):', code);
    
    // Разбор кода Честного знака
    const parsedData = parseHonestSignCode(code);
    
    if (parsedData) {
        // Показываем информацию о маркировке
        showHonestSignInfo(parsedData, code);
        
        // Если есть GTIN (штрих-код), ищем продукт
        if (parsedData.gtin) {
            setTimeout(() => {
                searchProduct(parsedData.gtin);
            }, 1000);
        }
    } else {
        showResultPanel(code, 'DataMatrix код');
    }
}

// Разбор кода Честного знака
function parseHonestSignCode(code) {
    try {
        // Формат GS1 DataMatrix: (01)GTIN(21)serial
        const gtinMatch = code.match(/01(\d{14})/);
        const serialMatch = code.match(/21([A-Za-z0-9]{13})/);
        
        if (gtinMatch && serialMatch) {
            return {
                gtin: gtinMatch[1], // 14-значный GTIN
                serial: serialMatch[1], // 13-значный серийный номер
                type: 'Честный знак (DataMatrix)',
                isValid: true
            };
        }
        
        // Альтернативный формат
        if (code.length === 31 && /^\d+$/.test(code)) {
            return {
                gtin: code.substring(2, 16), // Предполагаем GTIN с 3 по 16 символ
                serial: code.substring(16), // Остальное - серийный номер
                type: 'Честный знак (альтернативный формат)',
                isValid: true
            };
        }
        
        // Если код начинается с цифр
        if (/^\d{14,}$/.test(code)) {
            return {
                gtin: code.substring(0, 14),
                serial: code.substring(14) || 'Не указан',
                type: 'Маркировочный код',
                isValid: true
            };
        }
        
    } catch (error) {
        console.error('Ошибка разбора кода:', error);
    }
    
    return null;
}

// Показ информации о Честном знаке
function showHonestSignInfo(data, originalCode) {
    const infoHtml = `
        <div class="section" style="margin-top: 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 15px;">
                <i class="fas fa-shield-alt"></i> Информация о маркировке
            </h3>
            
            <div style="background: var(--bg-tertiary); padding: 20px; border-radius: var(--radius-sm);">
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary);">Тип кода:</span>
                        <span style="color: var(--text-primary); font-weight: 600;">${data.type}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary);">GTIN (штрих-код):</span>
                        <span style="color: var(--accent-color); font-weight: 600;">${data.gtin}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary);">Серийный номер:</span>
                        <span style="color: var(--text-primary); font-family: monospace;">${data.serial}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-secondary);">Статус:</span>
                        <span style="color: ${data.isValid ? 'var(--success-color)' : 'var(--warning-color)'};">
                            <i class="fas fa-${data.isValid ? 'check-circle' : 'exclamation-triangle'}"></i>
                            ${data.isValid ? 'Валидный' : 'Проверьте код'}
                        </span>
                    </div>
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;">
                        <i class="fas fa-info-circle"></i> 
                        Код маркировки "Честный знак" используется для отслеживания товаров в РФ.
                        Ищем информацию о продукте по GTIN...
                    </p>
                    
                    <div id="honestSignLoading" style="text-align: center; padding: 10px;">
                        <div class="loading"></div>
                        <p style="color: var(--text-secondary); margin-top: 10px;">Поиск продукта...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Вставляем информацию перед результатами
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        resultDiv.insertAdjacentHTML('beforebegin', infoHtml);
    }
    
    showNotification('Распознан код маркировки', 'success');
}

// Показ панели результата
function showResultPanel(code, title) {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.insertAdjacentHTML('afterend', `
        <div class="section" style="margin-top: 20px; animation: fadeIn 0.5s ease;">
            <h3 style="color: var(--text-primary); margin-bottom: 15px;">
                <i class="fas fa-qrcode"></i> ${title}
            </h3>
            
            <div style="background: var(--bg-tertiary); padding: 20px; border-radius: var(--radius-sm); word-break: break-all;">
                <p style="color: var(--text-primary); font-family: monospace; font-size: 14px; margin-bottom: 15px;">
                    ${code}
                </p>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="copyToClipboard('${code}')" class="btn" style="background: var(--info-color); color: white;">
                        <i class="fas fa-copy"></i> Копировать
                    </button>
                    
                    ${code.startsWith('http') ? `
                    <a href="${code}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i> Перейти
                    </a>
                    ` : ''}
                    
                    <button onclick="searchProduct('${code}')" class="btn" style="background: var(--success-color); color: white;">
                        <i class="fas fa-search"></i> Найти продукт
                    </button>
                </div>
            </div>
        </div>
    `);
}

// ===== УТИЛИТЫ ДЛЯ РЕЖИМОВ СКАНИРОВАНИЯ =====
function getScanModeName() {
    switch(scanMode) {
        case 'barcode': return 'Штрих-коды';
        case 'honest_sign': return 'Честный знак';
        case 'qr': return 'QR-коды';
        default: return 'Штрих-коды';
    }
}

function getScanModeIcon() {
    switch(scanMode) {
        case 'barcode': return 'barcode';
        case 'honest_sign': return 'shield-alt';
        case 'qr': return 'qrcode';
        default: return 'barcode';
    }
}

function getScanModeHint() {
    switch(scanMode) {
        case 'barcode': return 'Наведите на штрих-код на упаковке';
        case 'honest_sign': return 'Наведите на квадратный код маркировки';
        case 'qr': return 'Наведите на QR-код';
        default: return 'Наведите на код для сканирования';
    }
}

function getScanFormats() {
    const ZXing = window.ZXing;
    if (!ZXing) return [];
    
    switch(scanMode) {
        case 'barcode':
            return [
                ZXing.BarcodeFormat.EAN_13,
                ZXing.BarcodeFormat.EAN_8,
                ZXing.BarcodeFormat.UPC_A,
                ZXing.BarcodeFormat.UPC_E,
                ZXing.BarcodeFormat.CODE_128,
                ZXing.BarcodeFormat.CODE_39
            ];
        case 'honest_sign':
            return [
                ZXing.BarcodeFormat.DATA_MATRIX,
                ZXing.BarcodeFormat.QR_CODE,
                ZXing.BarcodeFormat.EAN_13
            ];
        case 'qr':
            return [
                ZXing.BarcodeFormat.QR_CODE,
                ZXing.BarcodeFormat.DATA_MATRIX
            ];
        default:
            return Object.values(ZXing.BarcodeFormat);
    }
}

function getBarcodeDetectorFormats() {
    switch(scanMode) {
        case 'barcode':
            return ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];
        case 'honest_sign':
            return ['datamatrix', 'qr_code'];
        case 'qr':
            return ['qr_code', 'datamatrix'];
        default:
            return ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'datamatrix'];
    }
}

// ===== АЛЬТЕРНАТИВЫ ДЛЯ IOS =====
function showIOSAlternatives() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div class="section" style="text-align: center; padding: 30px 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle"></i> Камера недоступна
            </h3>
            
            <div style="background: var(--bg-tertiary); padding: 20px; border-radius: var(--radius-sm); margin-bottom: 25px;">
                <p style="color: var(--text-secondary); margin-bottom: 15px;">
                    Для использования камеры на iOS:
                </p>
                
                <ol style="text-align: left; color: var(--text-secondary); padding-left: 20px; font-size: 14px; line-height: 1.6;">
                    <li><strong>Обновите страницу</strong> и разрешите доступ к камере</li>
                    <li>Или откройте в <strong>Safari</strong> (не в других браузерах)</li>
                    <li>Проверьте <strong>Настройки > Safari > Камера</strong></li>
                    <li>Убедитесь, что сайт открыт по <strong>HTTPS</strong></li>
                </ol>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px; max-width: 300px; margin: 0 auto;">
                <button id="retryCameraBtn" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Попробовать снова
                </button>
                
                <button id="uploadPhotoIOSBtn" class="btn" style="background: var(--info-color); color: white;">
                    <i class="fas fa-camera"></i> Сфотографировать код
                </button>
                
                <button id="useManualIOSBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary);">
                    <i class="fas fa-keyboard"></i> Ввести код вручную
                </button>
            </div>
        </div>
    `;
    
    // Обработчики для iOS альтернатив
    setTimeout(() => {
        document.getElementById('retryCameraBtn').addEventListener('click', () => {
            location.reload(); // Перезагрузка часто помогает на iOS
        });
        
        document.getElementById('uploadPhotoIOSBtn').addEventListener('click', () => {
            showFileUploadIOS();
        });
        
        document.getElementById('useManualIOSBtn').addEventListener('click', () => {
            if (elements.manualBarcodeInput) {
                elements.manualBarcodeInput.focus();
                showNotification('Введите код в поле выше', 'info');
            }
        });
    }, 100);
}

// Загрузка фото для iOS
function showFileUploadIOS() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div class="section" style="text-align: center; padding: 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 15px;">
                <i class="fas fa-camera"></i> Загрузите фото кода
            </h3>
            
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                Сфотографируйте штрих-код или маркировку
            </p>
            
            <div style="margin: 20px 0;">
                <input type="file" id="iosFileInput" accept="image/*" capture="environment" 
                       style="display: none;">
                <button id="iosTakePhotoBtn" class="btn btn-primary" style="margin: 5px;">
                    <i class="fas fa-camera"></i> Сделать фото
                </button>
                <button id="iosChoosePhotoBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); margin: 5px;">
                    <i class="fas fa-images"></i> Выбрать из галереи
                </button>
            </div>
            
            <div id="iosPhotoPreview" style="margin-top: 20px;"></div>
        </div>
    `;
    
    setTimeout(() => {
        const takePhotoBtn = document.getElementById('iosTakePhotoBtn');
        const choosePhotoBtn = document.getElementById('iosChoosePhotoBtn');
        const fileInput = document.getElementById('iosFileInput');
        
        if (takePhotoBtn) {
            takePhotoBtn.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }
        
        if (choosePhotoBtn) {
            choosePhotoBtn.addEventListener('click', () => {
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
                    processImageFileIOS(file);
                }
            });
        }
    }, 100);
}

// Обработка фото для iOS
async function processImageFileIOS(file) {
    const preview = document.getElementById('iosPhotoPreview');
    if (!preview) return;
    
    preview.innerHTML = '<p style="color: var(--text-secondary);">⏳ Обработка фото...</p>';
    
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
                if (typeof ZXing !== 'undefined') {
                    const codeReader = new ZXing.BrowserMultiFormatReader();
                    const formats = getScanFormats();
                    codeReader.hints = new Map([
                        [ZXing.DecodeHintType.POSSIBLE_FORMATS, formats]
                    ]);
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const result = await codeReader.decodeFromCanvas(canvas);
                    
                    if (result) {
                        preview.innerHTML += `
                            <div style="background: var(--success-color); color: white; padding: 10px; border-radius: var(--radius-sm); margin-top: 10px;">
                                ✅ Распознан код: <strong>${result.text}</strong>
                            </div>
                            <button onclick="handleScanResult('${result.text}', '${result.format}')" class="btn btn-success" style="margin-top: 10px;">
                                <i class="fas fa-check"></i> Использовать код
                            </button>
                        `;
                    } else {
                        preview.innerHTML += `
                            <div style="background: var(--warning-color); color: white; padding: 10px; border-radius: var(--radius-sm); margin-top: 10px;">
                                ❌ Код не найден на фото
                            </div>
                        `;
                    }
                } else {
                    preview.innerHTML += `
                        <div style="background: var(--warning-color); color: white; padding: 10px; border-radius: var(--radius-sm); margin-top: 10px;">
                            ⚠️ Распознавание не доступно
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

// [ОСТАЛЬНЫЕ ФУНКЦИИ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ...]
// searchProduct, searchInAllAPIs, displayProduct, loadHistory, saveToHistory, 
// clearHistory, showNotification, toggleTheme, updateProgressBar и т.д.
// [ВСТАВЬТЕ ИХ СЮДА БЕЗ ИЗМЕНЕНИЙ]

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text)
        .then(() => showNotification('Скопировано в буфер обмена', 'success'))
        .catch(() => showNotification('Не удалось скопировать', 'error'));
};

window.handleScanResult = handleScanResult;

// Инициализация при полной загрузке
window.addEventListener('load', function() {
    console.log('✅ Приложение полностью загружено');
    
    // Показываем приветствие
    setTimeout(() => {
        showNotification('Сканер БЖУ готов к работе!', 'success');
    }, 1000);
});