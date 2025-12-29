// Общий JavaScript для всех страниц
class AuthApp {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }
    
    init() {
        // Если мы на странице входа
        if (document.getElementById('loginForm')) {
            this.initLoginPage();
        }
        
        // Если мы на dashboard
        if (document.getElementById('logoutBtn')) {
            this.initDashboard();
        }
        
        // Проверяем авторизацию на всех страницах
        this.checkAuthStatus();
    }
    
    initLoginPage() {
        const loginForm = document.getElementById('loginForm');
        const fillTestBtn = document.getElementById('fillTestBtn');
        const errorAlert = document.getElementById('errorAlert');
        const warningAlert = document.getElementById('warningAlert');
        const successAlert = document.getElementById('successAlert');
        const attemptsInfo = document.getElementById('attemptsInfo');
        const submitBtn = document.getElementById('submitBtn');
        
        // Заполнить тестовые данные
        fillTestBtn.addEventListener('click', () => {
            document.getElementById('username').value = 'admin';
            document.getElementById('password').value = 'password123';
            
            successAlert.textContent = 'Тестовые данные заполнены! Нажмите "Войти в систему"';
            successAlert.style.display = 'block';
            errorAlert.style.display = 'none';
            warningAlert.style.display = 'none';
        });
        
        // Проверить попытки при загрузке
        this.checkAttempts();
        
        // Обработчик отправки формы
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                this.showAlert(errorAlert, 'Заполните все поля');
                return;
            }
            
            // Показать состояние загрузки
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch(`${this.apiBase}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // Успешный вход
                    this.showAlert(successAlert, 'Вход успешен! Перенаправление...');
                    
                    // Перенаправление на dashboard
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                    
                } else {
                    // Ошибка входа
                    this.showAlert(errorAlert, data.message || data.error || 'Ошибка авторизации');
                    
                    // Обновить информацию о попытках
                    this.checkAttempts();
                    
                    // Если ошибка "неверные данные", предложить тестовые данные
                    if (data.message && data.message.includes('Неверные данные')) {
                        setTimeout(() => {
                            fillTestBtn.click();
                        }, 1000);
                    }
                }
                
            } catch (error) {
                this.showAlert(errorAlert, 'Ошибка соединения с сервером');
                console.error('Login error:', error);
                
            } finally {
                // Восстановить кнопку
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти в систему';
                submitBtn.disabled = false;
            }
        });
    }
    
    initDashboard() {
        const logoutBtn = document.getElementById('logoutBtn');
        const errorAlert = document.getElementById('errorAlert');
        
        // Выйти из системы
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${this.apiBase}/logout`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    this.showAlert(errorAlert, 'Ошибка при выходе');
                }
            } catch (error) {
                this.showAlert(errorAlert, 'Ошибка соединения с сервером');
            }
        });
        
        // Загрузить информацию о пользователе
        this.loadUserInfo();
    }
    
    async checkAuthStatus() {
        // Если мы на dashboard, проверяем авторизацию
        if (window.location.pathname === '/dashboard' || window.location.pathname.includes('dashboard')) {
            try {
                const response = await fetch(`${this.apiBase}/check-auth`);
                const data = await response.json();
                
                if (!data.authenticated) {
                    // Не авторизован - перенаправляем на страницу входа
                    window.location.href = '/';
                } else {
                    // Обновляем имя пользователя
                    const usernameElement = document.getElementById('username');
                    if (usernameElement && data.user) {
                        usernameElement.textContent = data.user.username || 'Пользователь';
                    }
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                // При ошибке проверки тоже перенаправляем на вход
                window.location.href = '/';
            }
        }
    }
    
    async checkAttempts() {
        const attemptsInfo = document.getElementById('attemptsInfo');
        const warningAlert = document.getElementById('warningAlert');
        
        if (!attemptsInfo) return;
        
        try {
            const response = await fetch(`${this.apiBase}/attempts`);
            const data = await response.ok ? await response.json() : {};
            
            if (data.attempts > 0) {
                if (data.blocked) {
                    this.showAlert(warningAlert, `Аккаунт заблокирован. Попробуйте через ${data.minutesLeft} минут.`);
                    attemptsInfo.style.display = 'none';
                } else {
                    attemptsInfo.textContent = `У вас осталось ${data.attemptsLeft} попыток из 5`;
                    attemptsInfo.style.display = 'block';
                    
                    if (data.attemptsLeft <= 2) {
                        this.showAlert(warningAlert, `Внимание! Осталось только ${data.attemptsLeft} попытки.`);
                    }
                }
            } else {
                attemptsInfo.style.display = 'none';
            }
            
        } catch (error) {
            // Игнорируем ошибки при проверке попыток
            console.error('Attempts check error:', error);
        }
    }
    
    async loadUserInfo() {
        try {
            const response = await fetch(`${this.apiBase}/check-auth`);
            if (response.ok) {
                const data = await response.json();
                
                // Обновляем информацию на dashboard
                if (data.user) {
                    const usernameElement = document.getElementById('username');
                    if (usernameElement) {
                        usernameElement.textContent = data.user.username.charAt(0).toUpperCase() + data.user.username.slice(1);
                    }
                    
                    // Обновляем время последнего входа
                    const lastLoginElement = document.getElementById('lastLogin');
                    if (lastLoginElement) {
                        const now = new Date();
                        lastLoginElement.textContent = now.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    }
    
    showAlert(alertElement, message) {
        if (alertElement) {
            alertElement.textContent = message;
            alertElement.style.display = 'block';
            
            // Скрыть через 5 секунд
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.authApp = new AuthApp();
});