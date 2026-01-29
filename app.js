// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP =====
const tg = window.Telegram.WebApp;
if (tg && tg.initData) {
    tg.expand();
    tg.setHeaderColor('#4361ee');
    tg.setBackgroundColor('#f8f5fa');
    tg.enableClosingConfirmation();
}

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let currentStream = null;
let currentProduct = null;
let isScanningActive = false;
let currentFacingMode = 'environment';
let torchEnabled = false;
let codeReader = null;
let scanMode = 'barcode'; // 'barcode' или 'honest_sign' или 'qr'

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Сканер БЖУ инициализируется...');
    
    // Инициализация темы
    initTheme();
    
    // Загрузка истории
    loadHistory();
    
    // Проверка поддержки камеры
    checkCameraSupport();
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    // Настройка Telegram функций
    if (tg && tg.initData) {
        console.log('📱 Запущено в Telegram Mini App');
        setupTelegramFeatures();
    }
    
    // Автофокус на поле ввода
    const manualInput = document.getElementById('manualBarcode');
    if (manualInput) {
        manualInput.focus();
    }
    
    // Обновление прогресс-бара при прокрутке
    window.addEventListener('scroll', updateProgressBar);
    
    console.log('✅ Приложение готово к работе');
});

// ===== ФУНКЦИИ ТЕМЫ =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    showNotification(`Тема: ${newTheme === 'dark' ? 'тёмная' : 'светлая'}`, 'info');
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    console.log('🔄 Настройка обработчиков событий...');
    
    // Основные кнопки сканера
    const startScannerBtn = document.getElementById('startScanner');
    const stopScannerBtn = document.getElementById('stopScanner');
    const checkManualBtn = document.getElementById('checkManual');
    const saveProductBtn = document.getElementById('saveProduct');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const themeToggle = document.getElementById('themeToggle');
    const closeApp = document.getElementById('closeApp');
    const manualBarcodeInput = document.getElementById('manualBarcode');
    
    // Кнопка запуска сканера
    if (startScannerBtn) {
        startScannerBtn.addEventListener('click', function() {
            console.log('🎬 Нажата кнопка запуска сканера');
            showScanModeSelector();
        });
    }
    
    // Кнопка остановки сканера
    if (stopScannerBtn) {
        stopScannerBtn.addEventListener('click', function() {
            console.log('⏹️ Нажата кнопка остановки сканера');
            stopScanner();
        });
    }
    
    // Кнопка ручного поиска
    if (checkManualBtn) {
        checkManualBtn.addEventListener('click', function() {
            console.log('🔍 Нажата кнопка ручного поиска');
            handleManualSearch();
        });
    }
    
    // Кнопка сохранения в историю
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', function() {
            console.log('💾 Нажата кнопка сохранения');
            saveToHistory();
        });
    }
    
    // Кнопка очистки истории
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function() {
            console.log('🗑️ Нажата кнопка очистки истории');
            clearHistory();
        });
    }
    
    // Кнопка переключения темы
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            console.log('🎨 Нажата кнопка темы');
            toggleTheme();
        });
    }
    
    // Кнопка закрытия приложения
    if (closeApp) {
        closeApp.addEventListener('click', function() {
            console.log('❌ Нажата кнопка закрытия');
            if (tg && tg.close) {
                tg.close();
            } else {
                if (confirm('Закрыть приложение?')) {
                    window.close();
                }
            }
        });
    }
    
    // Ручной ввод по Enter
    if (manualBarcodeInput) {
        manualBarcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('⌨️ Нажат Enter в поле ввода');
                handleManualSearch();
            }
        });
    }
    
    // Тестовые штрих-коды
    document.querySelectorAll('.code-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const barcode = this.dataset.code;
            console.log(`🧪 Выбран тестовый код: ${barcode}`);
            if (manualBarcodeInput) {
                manualBarcodeInput.value = barcode;
                handleManualSearch();
            }
        });
    });
    
    console.log('✅ Обработчики событий настроены');
}

// ===== ВЫБОР РЕЖИМА СКАНИРОВАНИЯ =====
function showScanModeSelector() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    console.log('🔘 Показываем выбор режима сканирования');
    
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
    
    // Добавляем обработчики для кнопок выбора режима
    setTimeout(() => {
        const barcodeBtn = document.getElementById('scanBarcodeBtn');
        const honestSignBtn = document.getElementById('scanHonestSignBtn');
        const qrBtn = document.getElementById('scanQrBtn');
        
        if (barcodeBtn) {
            barcodeBtn.addEventListener('click', function() {
                console.log('📦 Выбран режим: Штрих-коды');
                scanMode = 'barcode';
                initScanner();
            });
        }
        
        if (honestSignBtn) {
            honestSignBtn.addEventListener('click', function() {
                console.log('🏷️ Выбран режим: Честный знак');
                scanMode = 'honest_sign';
                initScanner();
            });
        }
        
        if (qrBtn) {
            qrBtn.addEventListener('click', function() {
                console.log('🔳 Выбран режим: QR-коды');
                scanMode = 'qr';
                initScanner();
            });
        }
    }, 100);
}

// ===== ОСНОВНАЯ ФУНКЦИЯ СКАНЕРА =====
async function initScanner() {
    console.log(`📷 Запуск сканера в режиме: ${scanMode}`);
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        await initScannerIOS();
    } else {
        await initScannerStandard();
    }
}

// ===== СКАНЕР ДЛЯ IOS =====
async function initScannerIOS() {
    console.log('🍎 Используем iOS-совместимый сканер');
    
    try {
        showLoading(true);
        
        const scannerContainer = document.getElementById('qr-reader');
        if (!scannerContainer) return;
        
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
            </div>
        `;
        
        // Обработчик для iOS
        setTimeout(() => {
            const continueBtn = document.getElementById('continueScanBtn');
            if (continueBtn) {
                continueBtn.addEventListener('click', async function() {
                    await startIOSCamera();
                });
            }
        }, 100);
        
    } catch (error) {
        console.error('Ошибка инициализации iOS:', error);
        showNotification('Ошибка доступа к камере на iOS', 'error');
    } finally {
        showLoading(false);
    }
}

async function startIOSCamera() {
    try {
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { min: 640, ideal: 1280 },
                height: { min: 480, ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: false
        };
        
        console.log('📱 Запрашиваем доступ к камере на iOS...');
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('✅ Камера на iOS успешно запущена');
        
        currentStream = stream;
        isScanningActive = true;
        
        // Обновляем UI кнопок
        const startBtn = document.getElementById('startScanner');
        const stopBtn = document.getElementById('stopScanner');
        if (startBtn) startBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.remove('hidden');
        
        // Создаём интерфейс сканера
        createIOSScannerUI(stream);
        
        // Настраиваем видео
        const video = document.getElementById('cameraPreview');
        if (video) {
            video.srcObject = stream;
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            
            video.onloadedmetadata = () => {
                console.log('🎥 Видео метаданные загружены');
                video.play().catch(e => {
                    console.error('Ошибка воспроизведения:', e);
                });
            };
        }
        
        // Запускаем сканирование
        startIOSScanning(video);
        showNotification('Камера активирована', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка камеры iOS:', error);
        showNotification('Не удалось получить доступ к камере', 'error');
        showIOSAlternatives();
    }
}

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
        </div>
        
        <div style="text-align: center; margin-top: 15px;">
            <button id="iosTorchBtn" class="btn" style="background: var(--warning-color); color: white; margin: 5px;">
                <i class="fas fa-lightbulb"></i> Вкл. подсветку
            </button>
            <button id="iosStopBtn" class="btn" style="background: var(--danger-color); color: white; margin: 5px;">
                <i class="fas fa-stop"></i> Остановить
            </button>
        </div>
    `;
    
    // Обработчики для iOS
    setTimeout(() => {
        const video = document.getElementById('cameraPreview');
        
        // Кнопка подсветки
        const torchBtn = document.getElementById('iosTorchBtn');
        if (torchBtn) {
            torchBtn.addEventListener('click', function() {
                toggleIOSFlashlight(video);
            });
        }
        
        // Кнопка остановки
        const stopBtn = document.getElementById('iosStopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', function() {
                stopScanner();
            });
        }
    }, 100);
}

function toggleIOSFlashlight(video) {
    const torchBtn = document.getElementById('iosTorchBtn');
    
    if (torchEnabled) {
        video.style.filter = 'brightness(1) contrast(1)';
        torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Вкл. подсветку';
        torchBtn.style.background = 'var(--warning-color)';
        torchEnabled = false;
        showNotification('Подсветка выключена', 'info');
    } else {
        video.style.filter = 'brightness(1.8) contrast(1.2)';
        torchBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Выкл. подсветку';
        torchBtn.style.background = 'var(--danger-color)';
        torchEnabled = true;
        showNotification('Подсветка включена', 'success');
    }
}

function startIOSScanning(video) {
    if (!video || typeof ZXing === 'undefined') return;
    
    console.log('🔍 Запуск сканирования на iOS...');
    
    codeReader = new ZXing.BrowserMultiFormatReader();
    const formats = getScanFormats();
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    function scanIOS() {
        if (!isScanningActive || !video.videoWidth) return;
        
        try {
            canvas.width = Math.min(video.videoWidth, 800);
            canvas.height = Math.min(video.videoHeight, 600);
            
            context.drawImage(
                video, 
                0, 0, video.videoWidth, video.videoHeight,
                0, 0, canvas.width, canvas.height
            );
            
            codeReader.decodeFromCanvas(canvas)
                .then(result => {
                    console.log(`✅ iOS распознал код:`, result.text);
                    handleScanResult(result.text, result.format);
                    stopScanner();
                    playScanSound();
                })
                .catch(() => {
                    if (isScanningActive) {
                        requestAnimationFrame(scanIOS);
                    }
                });
                
        } catch (error) {
            if (isScanningActive) {
                setTimeout(scanIOS, 100);
            }
        }
    }
    
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
        const startBtn = document.getElementById('startScanner');
        const stopBtn = document.getElementById('stopScanner');
        if (startBtn) startBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.remove('hidden');
        
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
        
        // Переключение камеры
        const switchBtn = document.getElementById('switchCameraBtn');
        if (switchBtn) {
            switchBtn.addEventListener('click', function() {
                switchCamera(stream, video);
            });
        }
        
        // Фонарик
        const torchBtn = document.getElementById('toggleTorchBtn');
        if (torchBtn) {
            torchBtn.addEventListener('click', function() {
                toggleTorch(stream, video);
            });
        }
        
        // Смена режима
        const modeBtn = document.getElementById('changeModeBtn');
        if (modeBtn) {
            modeBtn.addEventListener('click', function() {
                stopScanner();
                showScanModeSelector();
            });
        }
    }, 100);
}

async function switchCamera(oldStream, video) {
    if (!oldStream || !video) return;
    
    try {
        oldStream.getTracks().forEach(track => track.stop());
        
        const track = oldStream.getVideoTracks()[0];
        const settings = track.getSettings();
        currentFacingMode = settings.facingMode || 'environment';
        
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        currentFacingMode = newFacingMode;
        
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: newFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        currentStream = newStream;
        video.srcObject = newStream;
        
        showNotification(`Камера: ${newFacingMode === 'environment' ? 'Задняя' : 'Фронтальная'}`, 'info');
        
    } catch (error) {
        console.error('Ошибка переключения камеры:', error);
        showNotification('Не удалось переключить камеру', 'error');
    }
}

async function toggleTorch(stream, video) {
    if (!stream || !video) return;
    
    try {
        const track = stream.getVideoTracks()[0];
        
        if ('torch' in track.getCapabilities()) {
            const torchBtn = document.getElementById('toggleTorchBtn');
            const isTorchOn = track.getConstraints().torch || false;
            
            await track.applyConstraints({
                advanced: [{ torch: !isTorchOn }]
            });
            
            torchEnabled = !isTorchOn;
            
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
        } else {
            // Альтернативный метод
            const torchBtn = document.getElementById('toggleTorchBtn');
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

function startStandardScanning(video) {
    if (!video) return;
    
    if (typeof BarcodeDetector !== 'undefined') {
        startBarcodeDetectorScanning(video);
    } else {
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
                    console.log(`✅ Распознан код:`, barcode.rawValue);
                    handleScanResult(barcode.rawValue, barcode.format);
                    stopScanner();
                    playScanSound();
                    return;
                }
            } catch (error) {
                // Игнорируем ошибки
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
                    console.log(`✅ ZXing распознал:`, result.text);
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

// ===== ОСТАНОВКА СКАНЕРА =====
function stopScanner() {
    console.log('🛑 Остановка сканера...');
    
    isScanningActive = false;
    
    // Останавливаем видео поток
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Обновляем UI
    const startBtn = document.getElementById('startScanner');
    const stopBtn = document.getElementById('stopScanner');
    if (startBtn) startBtn.classList.remove('hidden');
    if (stopBtn) stopBtn.classList.add('hidden');
    
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
    
    showNotification('Сканирование остановлено', 'info');
}

// ===== ОБРАБОТКА РЕЗУЛЬТАТОВ =====
function handleScanResult(code, format) {
    console.log(`📊 Обработка результата: ${code}`);
    
    const detectedType = detectCodeType(code, format);
    
    switch(detectedType) {
        case 'ean13':
        case 'ean8':
        case 'upca':
        case 'upce':
        case 'code128':
        case 'code39':
            searchProduct(code);
            break;
            
        case 'datamatrix':
            processDataMatrixCode(code);
            break;
            
        case 'qr_code':
            if (code.startsWith('http')) {
                showResultPanel(code, 'QR-код (ссылка)');
            } else {
                showResultPanel(code, 'QR-код');
            }
            break;
            
        default:
            if (code.length >= 8 && code.length <= 14 && /^\d+$/.test(code)) {
                searchProduct(code);
            } else {
                showResultPanel(code, 'Распознанный код');
            }
    }
}

function detectCodeType(code, format) {
    if (format) {
        return format.toLowerCase();
    }
    
    if (/^01\d{14}21[A-Za-z0-9]{13}$/.test(code)) {
        return 'datamatrix';
    } else if (code.length === 13 && /^\d+$/.test(code)) {
        return 'ean13';
    } else if (code.length === 8 && /^\d+$/.test(code)) {
        return 'ean8';
    } else if (code.length === 12 && /^\d+$/.test(code)) {
        return 'upca';
    } else if (code.startsWith('http')) {
        return 'qr_code';
    }
    
    return 'unknown';
}

function processDataMatrixCode(code) {
    console.log('🏷️ Обработка DataMatrix кода:', code);
    
    const parsedData = parseHonestSignCode(code);
    
    if (parsedData) {
        showHonestSignInfo(parsedData, code);
        
        if (parsedData.gtin) {
            setTimeout(() => {
                searchProduct(parsedData.gtin);
            }, 1000);
        }
    } else {
        showResultPanel(code, 'DataMatrix код');
    }
}

function parseHonestSignCode(code) {
    try {
        const gtinMatch = code.match(/01(\d{14})/);
        const serialMatch = code.match(/21([A-Za-z0-9]{13})/);
        
        if (gtinMatch && serialMatch) {
            return {
                gtin: gtinMatch[1],
                serial: serialMatch[1],
                type: 'Честный знак (DataMatrix)',
                isValid: true
            };
        }
        
        if (code.length === 31 && /^\d+$/.test(code)) {
            return {
                gtin: code.substring(2, 16),
                serial: code.substring(16),
                type: 'Честный знак',
                isValid: true
            };
        }
        
    } catch (error) {
        console.error('Ошибка разбора кода:', error);
    }
    
    return null;
}

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
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <p style="color: var(--text-secondary); font-size: 13px;">
                        <i class="fas fa-info-circle"></i> 
                        Ищем информацию о продукте по GTIN...
                    </p>
                </div>
            </div>
        </div>
    `;
    
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        resultDiv.insertAdjacentHTML('beforebegin', infoHtml);
    }
    
    showNotification('Распознан код маркировки', 'success');
}

function showResultPanel(code, title) {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    const panelHtml = `
        <div class="section" style="margin-top: 20px; animation: fadeIn 0.5s ease;">
            <h3 style="color: var(--text-primary); margin-bottom: 15px;">
                <i class="fas fa-qrcode"></i> ${title}
            </h3>
            
            <div style="background: var(--bg-tertiary); padding: 20px; border-radius: var(--radius-sm); word-break: break-all;">
                <p style="color: var(--text-primary); font-family: monospace; font-size: 14px; margin-bottom: 15px;">
                    ${code}
                </p>
                
                <div style="display: flex; gap: 10px;">
                    <button class="copy-btn btn" style="background: var(--info-color); color: white;" data-code="${code}">
                        <i class="fas fa-copy"></i> Копировать
                    </button>
                    
                    ${code.startsWith('http') ? `
                    <a href="${code}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i> Перейти
                    </a>
                    ` : ''}
                    
                    <button class="search-btn btn" style="background: var(--success-color); color: white;" data-code="${code}">
                        <i class="fas fa-search"></i> Найти продукт
                    </button>
                </div>
            </div>
        </div>
    `;
    
    scannerContainer.insertAdjacentHTML('afterend', panelHtml);
    
    // Добавляем обработчики для новых кнопок
    setTimeout(() => {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const code = this.getAttribute('data-code');
                copyToClipboard(code);
            });
        });
        
        document.querySelectorAll('.search-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const code = this.getAttribute('data-code');
                searchProduct(code);
            });
        });
    }, 100);
}

// ===== УТИЛИТЫ РЕЖИМОВ =====
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
                ZXing.BarcodeFormat.QR_CODE
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

// ===== ПОИСК ПРОДУКТА =====
function handleManualSearch() {
    const manualBarcodeInput = document.getElementById('manualBarcode');
    if (!manualBarcodeInput) return;
    
    const barcode = manualBarcodeInput.value.trim();
    
    if (!barcode) {
        showNotification('Введите штрих-код', 'warning');
        manualBarcodeInput.focus();
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
        
        if (testProducts[barcode]) {
            setTimeout(() => {
                displayProduct(testProducts[barcode], barcode);
                showLoading(false);
            }, 500);
            return;
        }
        
        // Пробуем Open Food Facts
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
        } catch (error) {
            console.log('Open Food Facts не сработал:', error);
        }
        
        // Если не нашли
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
        sourceElement.innerHTML = `
            <span style="color: var(--info-color);">
                <i class="fas fa-database"></i> ${product.source || 'Неизвестный источник'}
            </span>
        `;
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
    
    playSuccessSound();
    showNotification('Продукт найден!', 'success');
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

// ===== УТИЛИТЫ =====
function checkCameraSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Ваш браузер не поддерживает доступ к камере', 'warning');
        return false;
    }
    return true;
}

function handleCameraError(error) {
    console.error('📷 Ошибка камеры:', error);
    showNotification('Ошибка доступа к камере', 'error');
}

function showIOSAlternatives() {
    const scannerContainer = document.getElementById('qr-reader');
    if (!scannerContainer) return;
    
    scannerContainer.innerHTML = `
        <div class="section" style="text-align: center; padding: 30px 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle"></i> Камера недоступна
            </h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px; max-width: 300px; margin: 0 auto;">
                <button id="retryCameraBtn" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Попробовать снова
                </button>
                
                <button id="useManualIOSBtn" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary);">
                    <i class="fas fa-keyboard"></i> Ввести код вручную
                </button>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const retryBtn = document.getElementById('retryCameraBtn');
        const manualBtn = document.getElementById('useManualIOSBtn');
        
        if (retryBtn) {
            retryBtn.addEventListener('click', function() {
                location.reload();
            });
        }
        
        if (manualBtn) {
            manualBtn.addEventListener('click', function() {
                const manualInput = document.getElementById('manualBarcode');
                if (manualInput) {
                    manualInput.focus();
                    showNotification('Введите код в поле выше', 'info');
                }
            });
        }
    }, 100);
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
        // Игнорируем
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
        // Игнорируем
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

function updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    if (!progressFill) return;
    
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = Math.min((winScroll / height) * 100, 100);
    progressFill.style.width = scrolled + "%";
}

function setupTelegramFeatures() {
    if (tg && tg.MainButton) {
        tg.MainButton.setText('Сканировать');
        tg.MainButton.show();
        tg.MainButton.onClick(function() {
            showScanModeSelector();
        });
    }
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text)
        .then(() => showNotification('Скопировано в буфер обмена', 'success'))
        .catch(() => showNotification('Не удалось скопировать', 'error'));
};

// Инициализация при полной загрузке
window.addEventListener('load', function() {
    console.log('✅ Приложение полностью загружено');
    
    // Показываем приветствие
    setTimeout(() => {
        showNotification('Сканер БЖУ готов к работе!', 'success');
    }, 1000);
});