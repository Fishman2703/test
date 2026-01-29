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
function initScanner() {
    scanner = new Html5Qrcode("qr-reader");
    
    startScannerBtn.style.display = 'none';
    stopScannerBtn.style.display = 'inline-block';
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    scanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error(err);
        alert('Не удалось запустить камеру. Проверьте разрешения.');
        resetScanner();
    });
}

// Остановка сканера
function stopScanner() {
    if (scanner) {
        scanner.stop().then(() => {
            resetScanner();
        }).catch(err => {
            console.error(err);
            resetScanner();
        });
    }
}

// Сброс сканера
function resetScanner() {
    scanner = null;
    startScannerBtn.style.display = 'inline-block';
    stopScannerBtn.style.display = 'none';
}

// Успешное сканирование
function onScanSuccess(decodedText) {
    console.log('Найден штрих-код:', decodedText);
    searchProduct(decodedText);
    stopScanner();
}

// Ошибка сканирования
function onScanError(error) {
    // Игнорируем ошибки поиска (это нормально)
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