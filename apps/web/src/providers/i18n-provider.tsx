import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

export type AppLanguage = "en" | "es";

type TranslationKey =
  | "shell.enableNotifications"
  | "shell.notificationBlocked"
  | "shell.notificationEnableBody"
  | "shell.openNotificationSettings"
  | "shell.dismiss"
  | "shell.guestMode"
  | "shell.signOut"
  | "shell.language"
  | "shell.noAnomalies";

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey) => string;
}

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    "shell.enableNotifications": "Enable ride notifications",
    "shell.notificationBlocked": "Notifications are currently blocked in your browser. Open notification settings to re-enable push alerts.",
    "shell.notificationEnableBody": "Turn on push alerts so you get new jobs, accepts, arrivals, and ride status updates in real time.",
    "shell.openNotificationSettings": "Open notification settings",
    "shell.dismiss": "Dismiss",
    "shell.guestMode": "Guest mode",
    "shell.signOut": "Sign out",
    "shell.language": "Language",
    "shell.noAnomalies": "No anomalies detected for the current activity window."
  },
  es: {
    "shell.enableNotifications": "Activar notificaciones de viajes",
    "shell.notificationBlocked": "Las notificaciones están bloqueadas en tu navegador. Abre la configuración para volver a habilitarlas.",
    "shell.notificationEnableBody": "Activa las alertas para recibir nuevos viajes, aceptaciones, llegadas y cambios de estado en tiempo real.",
    "shell.openNotificationSettings": "Abrir configuración de notificaciones",
    "shell.dismiss": "Cerrar",
    "shell.guestMode": "Modo invitado",
    "shell.signOut": "Cerrar sesión",
    "shell.language": "Idioma",
    "shell.noAnomalies": "No se detectaron anomalías en la ventana de actividad actual."
  }
};

const STORAGE_KEY = "realdrive.ui.language";

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<AppLanguage>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") {
      setLanguage(saved);
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      setLanguage(nextLanguage);
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    },
    t: (key) => translations[language][key] ?? translations.en[key]
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
