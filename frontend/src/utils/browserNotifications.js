export async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    return Notification.requestPermission();
  }

  return Notification.permission;
}

export function showBrowserNotification({ title, body }) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return null;
  }

  return new Notification(title, {
    body,
    icon: "https://fav.farm/🚨"
  });
}
