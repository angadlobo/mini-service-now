import React, { useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme, MantineColorsTuple, CSSVariablesResolver } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useUiStore } from './store/ui';
import { useAuthStore } from './store/auth';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/tiptap/styles.css';
import '@mantine/spotlight/styles.css';
import './styles/global.css';

const COLOR_PALETTES: Record<string, MantineColorsTuple> = {
  indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#667eea', '#5b5bd6', '#4f46e5', '#4338ca', '#3730a3'],
  blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  teal: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'],
  green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
  pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
};

const GRADIENT_MAP: Record<string, string> = {
  indigo: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  blue: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  teal: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  green: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  red: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  orange: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  violet: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  pink: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
};

const cssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {},
  light: {
    '--msn-bg-subtle': 'rgba(255, 255, 255, 0.65)',
    '--msn-text-primary': '#1a1a2e',
    '--msn-text-secondary': '#4a5568',
    '--msn-border-subtle': 'rgba(0, 0, 0, 0.06)',
  },
  dark: {
    '--msn-bg-subtle': 'rgba(30, 30, 46, 0.65)',
    '--msn-text-primary': 'rgba(255, 255, 255, 0.92)',
    '--msn-text-secondary': 'rgba(255, 255, 255, 0.6)',
    '--msn-border-subtle': 'rgba(255, 255, 255, 0.08)',
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30000 },
  },
});

function ThemedApp() {
  const primaryColor = useUiStore((s) => s.primaryColor);
  const colorScheme = useUiStore((s) => s.colorScheme);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const loadBranding = useUiStore((s) => s.loadBranding);

  useEffect(() => {
    if (isAuthenticated) {
      loadBranding();
    }
  }, [isAuthenticated, loadBranding]);

  // Update CSS variables when primary color changes
  useEffect(() => {
    const gradient = GRADIENT_MAP[primaryColor] || GRADIENT_MAP.indigo;
    const palette = COLOR_PALETTES[primaryColor] || COLOR_PALETTES.indigo;
    document.documentElement.style.setProperty('--gradient-primary', gradient);
    document.documentElement.style.setProperty('--color-primary-5', palette[5]);
    document.documentElement.style.setProperty('--color-primary-6', palette[6]);
  }, [primaryColor]);

  const theme = useMemo(
    () =>
      createTheme({
        primaryColor,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        defaultRadius: 'md',
        colors: {
          [primaryColor]: (COLOR_PALETTES[primaryColor] || COLOR_PALETTES.indigo) as MantineColorsTuple,
        },
        headings: {
          sizes: {
            h1: { fontSize: '2rem', fontWeight: '800' },
            h2: { fontSize: '1.625rem', fontWeight: '700' },
            h3: { fontSize: '1.25rem', fontWeight: '600' },
          },
        },
        components: {
          Paper: { defaultProps: { shadow: 'sm', radius: 'lg' } },
          Button: { defaultProps: { radius: 'md' } },
          TextInput: { defaultProps: { radius: 'md' } },
          Select: { defaultProps: { radius: 'md' } },
          Modal: { defaultProps: { radius: 'lg' } },
          Badge: { defaultProps: { radius: 'md' } },
          Skeleton: { defaultProps: { radius: 'md' } },
          Tabs: {
            styles: () => ({
              tab: { fontWeight: 600 },
            }),
          },
        },
      }),
    [primaryColor],
  );

  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      forceColorScheme={colorScheme === 'auto' ? undefined : colorScheme}
      defaultColorScheme="auto"
    >
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
);
