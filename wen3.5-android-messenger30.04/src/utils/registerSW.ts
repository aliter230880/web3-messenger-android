/**
 * Регистрация Service Worker для PWA
 */

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('✅ Service Worker зарегистрирован:', registration.scope);

      // Проверка обновлений
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Доступно обновление
              console.log('🔄 Доступно обновление приложения');
              
              if (confirm('Доступна новая версия приложения. Перезагрузить?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('❌ Ошибка регистрации Service Worker:', error);
      return null;
    }
  }
  return null;
}

/**
 * Запрос разрешения на Push уведомления
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('❌ Уведомления не поддерживаются');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('📬 Разрешение на уведомления:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('❌ Ошибка запроса уведомлений:', error);
    return false;
  }
}

/**
 * Подписка на Push уведомления
 */
export async function subscribeToPush(vapidPublicKey: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('❌ Push уведомления не поддерживаются');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('✅ Подписка на Push:', subscription);
    return subscription;
  } catch (error) {
    console.error('❌ Ошибка подписки на Push:', error);
    return null;
  }
}

/**
 * Конвертация VAPID ключа
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
