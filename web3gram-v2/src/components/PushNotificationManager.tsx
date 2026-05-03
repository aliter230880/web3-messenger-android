import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { requestNotificationPermission, subscribeToPush } from '../utils/registerSW';

// VAPID PublicKey для Push уведомлений
// Замените на ваш ключ из Firebase/OneSignal
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверка поддержки
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      
      // Проверка текущей подписки
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      });
    }
  }, []);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const granted = await requestNotificationPermission();
      setPermission(granted ? 'granted' : 'denied');
      
      if (granted) {
        await handleSubscribe();
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при запросе разрешения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
      
      if (subscription) {
        setIsSubscribed(true);
        
        // TODO: Отправить subscription на сервер для отправки уведомлений
        console.log('✅ Подписка на Push:', subscription);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка подписки на Push');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        console.log('✅ Отписка от Push');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка отписки');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          isSubscribed 
            ? 'bg-emerald-100 dark:bg-emerald-900/20' 
            : 'bg-gray-200 dark:bg-gray-700'
        }`}>
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-500" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            Push уведомления
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {isSubscribed
              ? 'Уведомления включены'
              : permission === 'denied'
              ? 'Уведомления заблокированы'
              : 'Включите для получения уведомлений о новых сообщениях'}
          </p>

          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          <div className="flex gap-2">
            {!isSubscribed && permission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                disabled={isLoading}
                className="flex-1 py-2 px-3 bg-[#3390ec] hover:bg-[#2b7ecc] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Включить
                  </>
                )}
              </button>
            )}

            {isSubscribed && (
              <button
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="flex-1 py-2 px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Отключить
                  </>
                )}
              </button>
            )}

            {isSubscribed && (
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <Check className="w-4 h-4" />
                Активно
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
