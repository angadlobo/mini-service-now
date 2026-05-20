import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsApi } from '../api/common.api';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Color scheme
  colorScheme: 'light' | 'dark' | 'auto';
  toggleColorScheme: () => void;

  // Sidebar collapse
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;

  // Branding
  primaryColor: string;
  appName: string;
  logoUrl: string;
  setPrimaryColor: (color: string) => void;
  setAppName: (name: string) => void;
  setLogoUrl: (url: string) => void;
  loadBranding: () => Promise<void>;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      colorScheme: 'light',
      toggleColorScheme: () =>
        set((s) => ({
          colorScheme:
            s.colorScheme === 'light' ? 'dark' : s.colorScheme === 'dark' ? 'auto' : 'light',
        })),

      sidebarCollapsed: false,
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      primaryColor: 'violet',
      appName: 'Mini ServiceNow',
      logoUrl: '',
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setAppName: (name) => set({ appName: name }),
      setLogoUrl: (url) => set({ logoUrl: url }),
      loadBranding: async () => {
        try {
          const settings = await settingsApi.getAll();
          const brandingSettings = settings.filter((s: any) => s.category === 'branding');
          const map: Record<string, string> = {};
          brandingSettings.forEach((s: any) => { map[s.key] = s.value; });
          set({
            ...(map['branding.app_name'] ? { appName: map['branding.app_name'] } : {}),
            ...(map['branding.primary_color'] ? { primaryColor: map['branding.primary_color'] } : {}),
            ...(map['branding.logo_url'] ? { logoUrl: map['branding.logo_url'] } : {}),
          });
        } catch {
          // Settings may not have branding entries yet - use defaults
        }
      },
    }),
    {
      name: 'msn-ui',
      partialize: (state) => ({
        primaryColor: state.primaryColor,
        appName: state.appName,
        logoUrl: state.logoUrl,
        colorScheme: state.colorScheme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
