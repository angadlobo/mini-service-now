import { ReactNode, useEffect, useState } from 'react';
import {
  AppShell as MantineAppShell, Burger, Group, NavLink, Text, UnstyledButton, Avatar,
  Menu, Indicator, ActionIcon, Stack, ScrollArea, Box, Tooltip, Collapse,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import {
  IconDashboard, IconAlertTriangle, IconExchange, IconShoppingCart, IconBook,
  IconChecklist, IconUsers, IconBell, IconLogout, IconBug, IconServer, IconPlayerPlay,
  IconPlug, IconChartBar, IconForms, IconBrain, IconSettings, IconApps,
  IconCalendarEvent, IconGavel, IconTemplate, IconShieldOff, IconRocket,
  IconChevronRight, IconSearch, IconSun, IconMoon, IconDeviceDesktop,
  IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useUiStore } from '../../store/ui';
import { notificationApi } from '../../api/common.api';
import { authApi } from '../../api/auth.api';

interface NavItem {
  label: string;
  icon: typeof IconDashboard;
  path: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: IconDashboard, path: '/' },
      { label: 'My Approvals', icon: IconChecklist, path: '/approvals' },
    ],
  },
  {
    title: 'Service Desk',
    items: [
      { label: 'Incidents', icon: IconAlertTriangle, path: '/incidents' },
      { label: 'Problems', icon: IconBug, path: '/problems' },
    ],
  },
  {
    title: 'Changes & Releases',
    items: [
      { label: 'Changes', icon: IconExchange, path: '/changes' },
      { label: 'Change Calendar', icon: IconCalendarEvent, path: '/changes/calendar' },
      { label: 'CAB Board', icon: IconGavel, path: '/changes/cab' },
      { label: 'Releases', icon: IconRocket, path: '/releases' },
    ],
  },
  {
    title: 'CMDB & Catalog',
    items: [
      { label: 'CMDB', icon: IconServer, path: '/cmdb' },
      { label: 'Service Catalog', icon: IconShoppingCart, path: '/catalog' },
    ],
  },
  {
    title: 'Knowledge & Reports',
    items: [
      { label: 'Knowledge Base', icon: IconBook, path: '/knowledge' },
      { label: 'Reports', icon: IconChartBar, path: '/reports' },
      { label: 'Forms', icon: IconForms, path: '/forms' },
    ],
  },
];

const adminSection: NavSection = {
  title: 'Administration',
  items: [
    { label: 'Users', icon: IconUsers, path: '/admin/users' },
    { label: 'Workflows', icon: IconPlayerPlay, path: '/admin/workflows' },
    { label: 'Workflow Monitor', icon: IconChartBar, path: '/admin/workflows/monitoring' },
    { label: 'Change Templates', icon: IconTemplate, path: '/changes/templates' },
    { label: 'Maintenance Windows', icon: IconShieldOff, path: '/changes/maintenance-windows' },
    { label: 'Integrations', icon: IconPlug, path: '/admin/integrations' },
    { label: 'AI Providers', icon: IconBrain, path: '/admin/ai-providers' },
    { label: 'AI Prompts', icon: IconBrain, path: '/admin/ai-prompts' },
    { label: 'Notification Channels', icon: IconBell, path: '/admin/notification-channels' },
    { label: 'App Engine', icon: IconApps, path: '/admin/app-engine' },
    { label: 'System Settings', icon: IconSettings, path: '/admin/settings' },
  ],
};

function CollapsibleSection({
  section,
  collapsed,
  isActive,
  navigate,
}: {
  section: NavSection;
  collapsed: boolean;
  isActive: (path: string) => boolean;
  navigate: (path: string) => void;
}) {
  const hasActiveChild = section.items.some((item) => isActive(item.path));
  const [opened, { toggle }] = useDisclosure(hasActiveChild || true);

  if (collapsed) {
    return (
      <Stack gap={4}>
        {section.items.map((item) => {
          const active = isActive(item.path);
          return (
            <Tooltip key={item.path} label={item.label} position="right" withArrow>
              <ActionIcon
                variant={active ? 'light' : 'subtle'}
                size="lg"
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  ...(active
                    ? {
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.08) 100%)',
                        borderLeft: '3px solid var(--mantine-primary-color-filled)',
                      }
                    : {}),
                }}
              >
                <item.icon size={20} stroke={active ? 2 : 1.5} />
              </ActionIcon>
            </Tooltip>
          );
        })}
      </Stack>
    );
  }

  return (
    <Box>
      <UnstyledButton
        onClick={toggle}
        px="sm"
        py={4}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <IconChevronRight
          size={14}
          style={{
            transform: opened ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
            opacity: 0.5,
          }}
        />
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          style={{
            letterSpacing: '0.5px',
            opacity: 0.55,
            fontSize: '0.65rem',
          }}
        >
          {section.title}
        </Text>
      </UnstyledButton>
      <Collapse in={opened}>
        <Stack gap={2} ml={4}>
          {section.items.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                label={<Text size="sm" fw={active ? 600 : 400}>{item.label}</Text>}
                leftSection={<item.icon size={20} stroke={active ? 2 : 1.5} />}
                active={active}
                onClick={() => navigate(item.path)}
                variant="light"
                style={{
                  borderRadius: 10,
                  ...(active
                    ? {
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.08) 100%)',
                        borderLeft: '3px solid var(--mantine-primary-color-filled)',
                      }
                    : {}),
                }}
              />
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { appName, logoUrl, colorScheme, toggleColorScheme, sidebarCollapsed, toggleSidebarCollapsed } = useUiStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await notificationApi.list();
        setUnreadCount(data.unreadCount);
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const isAdmin = user?.roles.includes('admin');
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const navbarWidth = sidebarCollapsed ? 70 : 260;

  const colorSchemeIcon =
    colorScheme === 'light' ? <IconSun size={18} /> :
    colorScheme === 'dark' ? <IconMoon size={18} /> :
    <IconDeviceDesktop size={18} />;

  const colorSchemeLabel =
    colorScheme === 'light' ? 'Light mode (click for dark)' :
    colorScheme === 'dark' ? 'Dark mode (click for auto)' :
    'Auto mode (click for light)';

  return (
    <MantineAppShell
      header={{ height: 64 }}
      navbar={{
        width: navbarWidth,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="lg"
      transitionDuration={300}
      transitionTimingFunction="ease"
    >
      <MantineAppShell.Header
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d1b69 50%, #1a1a2e 100%)',
          borderBottom: 'none',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} size="sm" color="white" />
            <Group gap={8}>
              {logoUrl ? (
                <img src={logoUrl} alt={appName} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
              ) : (
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" fw={800} c="white">{appName.charAt(0)}</Text>
                </Box>
              )}
              <Text size="lg" fw={700} c="white" style={{ letterSpacing: '-0.5px' }}>
                {appName}
              </Text>
            </Group>
          </Group>
          <Group gap="sm">
            <Tooltip label="Search (Ctrl+K)">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => spotlight.open()}
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                <IconSearch size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={colorSchemeLabel}>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={toggleColorScheme}
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                {colorSchemeIcon}
              </ActionIcon>
            </Tooltip>

            <Tooltip label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={toggleSidebarCollapsed}
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                {sidebarCollapsed ? <IconLayoutSidebarLeftExpand size={20} /> : <IconLayoutSidebarLeftCollapse size={20} />}
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Notifications">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/approvals')}
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                <Indicator disabled={unreadCount === 0} label={unreadCount} size={16} color="red" processing>
                  <IconBell size={22} />
                </Indicator>
              </ActionIcon>
            </Tooltip>
            <Menu shadow="lg" width={200} radius="md">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Box style={{
                      padding: 2,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    }}>
                      <Avatar radius="xl" size="sm" color="white" style={{ border: '2px solid rgba(255,255,255,0.9)' }}>
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                      </Avatar>
                    </Box>
                    {!sidebarCollapsed && (
                      <div>
                        <Text size="sm" fw={500} c="white">{user?.first_name} {user?.last_name}</Text>
                        <Text size="xs" c="rgba(255,255,255,0.6)">{user?.roles?.join(', ')}</Text>
                      </div>
                    )}
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconLogout size={14} />} onClick={handleLogout} color="red">
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar
        p="xs"
        style={{
          background: 'var(--gradient-sidebar)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRight: '1px solid var(--glass-border)',
          transition: 'width 300ms ease',
        }}
      >
        <ScrollArea>
          <Stack gap={sidebarCollapsed ? 4 : 8} py="xs">
            {navSections.map((section) => (
              <CollapsibleSection
                key={section.title}
                section={section}
                collapsed={sidebarCollapsed}
                isActive={isActive}
                navigate={navigate}
              />
            ))}

            {isAdmin && (
              <>
                {!sidebarCollapsed && (
                  <Box px="sm" mt="md" mb={0}>
                    <Box style={{ height: 1, background: 'var(--glass-border)', marginBottom: 8 }} />
                  </Box>
                )}
                <CollapsibleSection
                  section={adminSection}
                  collapsed={sidebarCollapsed}
                  isActive={isActive}
                  navigate={navigate}
                />
              </>
            )}
          </Stack>
        </ScrollArea>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        {children}
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
