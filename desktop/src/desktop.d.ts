interface DesktopSessionStore {
  load: () => Promise<string | null>;
  save: (token: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
}

interface Window {
  desktop?: {
    platform: string;
    session: DesktopSessionStore;
  };
}
