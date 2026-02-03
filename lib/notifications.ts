
/**
 * Utilitário para Notificações Web Nativas
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("Este navegador não suporta notificações desktop");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendNativeNotification = (title: string, options?: NotificationOptions) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
      badge: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.error("Erro ao disparar notificação:", e);
  }
};
