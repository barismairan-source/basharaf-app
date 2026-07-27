/**
 * Browser-side Web Push subscription helpers.
 *
 * Feature detection matters here: iOS Safari only supports Web Push for
 * PWAs added to the home screen (not in a regular browser tab), and older
 * browsers lack PushManager entirely — getPushSupportStatus() lets the UI
 * show an accurate state instead of a broken button.
 */

export type PushSupportStatus = 'unsupported' | 'default' | 'denied' | 'granted';

export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/** Converts a VAPID public key (base64url) to the Uint8Array PushManager.subscribe expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the service worker, requests permission, subscribes, and stores
 * the subscription server-side. Throws on any failure — caller shows the error.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<void> {
  const registration = await navigator.serviceWorker.register('/sw-push.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('اجازه‌ی نوتیفیکیشن داده نشد');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!res.ok) {
    throw new Error('ثبت اشتراک روی سرور ناموفق بود');
  }
}

/** Unsubscribes the current browser and removes the server-side record. */
export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}

/** Returns the current browser's active subscription, if any. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (getPushSupportStatus() === 'unsupported') return null;
  const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
  return (await registration?.pushManager.getSubscription()) ?? null;
}
