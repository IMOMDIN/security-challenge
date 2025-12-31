// Общий JavaScript для всех страниц
document.addEventListener('DOMContentLoaded', function() {
  
  // Если мы на странице входа
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username')?.value;
      const password = document.getElementById('password')?.value;
      const errorEl = document.getElementById('error-message') || document.getElementById('errorAlert');
      const submitBtn = document.querySelector('button[type="submit"]');
      
      if (!username || !password) {
        showAlert(errorEl, 'Заполните все поля');
        return;
      }
      
      // Показать состояние загрузки
      if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
        submitBtn.disabled = true;
      }
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Успешный вход
          showAlert(errorEl, data.message || 'Успешно! Перенаправление...', 'success');
          
          // Перенаправление
          if (data.redirect) {
            setTimeout(() => {
              window.location.href = data.redirect;
            }, 1500);
          } else {
            setTimeout(() => {
              window.location.href = '/dashboard.html';
            }, 1500);
          }
        } else {
          // Ошибка входа
          showAlert(errorEl, data.message || data.error || 'Ошибка авторизации');
        }
      } catch (error) {
        showAlert(errorEl, 'Ошибка соединения с сервером');
        console.error('Login error:', error);
      } finally {
        // Восстановить кнопку
        if (submitBtn) {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }
      }
    });
  }
  
  // Функция для отображения сообщений
  function showAlert(element, message, type = 'error') {
    if (!element) return;
    
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = type === 'success' ? '#155724' : '#721c24';
    element.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    element.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
    
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
  
  // Автозаполнение тестовых данных
  const fillTestBtn = document.getElementById('fillTestBtn');
  if (fillTestBtn) {
    fillTestBtn.addEventListener('click', function() {
      const usernameInput = document.getElementById('username');
      const passwordInput = document.getElementById('password');
      
      if (usernameInput) usernameInput.value = 'admin';
      if (passwordInput) passwordInput.value = 'password123';
      
      showAlert(document.getElementById('success-message'), 'Тестовые данные заполнены!', 'success');
    });
  }
});