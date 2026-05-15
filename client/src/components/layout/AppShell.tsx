import { ReactNode, useEffect, useState } from 'react';
import { AppShell as MantineAppShell, Burger, Group, NavLink, Text, UnstyledButton, Avatar, Menu, Indicator, ActionIcon, Badge, Stack, Box, ScrollArea, useMantineTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDashboard, IconAlertTriangle, IconExchange, IconShoppingCart, IconBook, IconChecklist, IconUsers, IconBell, IconLogout, IconChevronRight, IconBug, IconServer, IconPlayerPlay, IconPlug, IconChartBar, IconForms, IconBrain, IconSettings, IconApps } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { notificationApi } from '../../api/common.api';
import { authApi } from '../../api/auth.api';

const navItems = [
  { label: 'Dashboard', icon: IconDashboard, path: '/' },
  { label: 'Incidents', icon: IconAlertTriangle, path: '/incidents' },
  { label: 'Changes', icon: IconExchange, path: '/changes' },
  { label: 'Problems', icon: IconBug, path: '/problems' },
  { label: 'CMDB', icon: IconServer, path: '/cmdb' },
  { label: 'Service Catalog', icon: IconShoppingCart, path: '/catalog' },
  { label: 'Knowledge Base', icon: IconBook, path: '/knowledge' },
  { label: 'Reports', icon: IconChartBar, path: '/reports' },
  { label: 'Forms', icon: IconForms, path: '/forms' },
  { label: 'My Approvals', icon: IconChecklist, path: '/approvals' },
];

const adminItems = [
  { label: 'Users', icon: IconUsers, path: '/admin/users' },
  { label: 'Workflows', icon: IconPlayerPlay, path: '/admin/workflows' },
  { label: 'Integrations', icon: IconPlug, path: '/admin/integrations' },
  { label: 'AI Providers', icon: IconBrain, path: '/admin/ai-providers' },
  { label: 'AI Prompts', icon: IconBrain, path: '/admin/ai-prompts' },
  { label: 'Notification Channels', icon: IconBell, path: '/admin/notification-channels' },
  { label: 'App Engine', icon: IconApps, path: '/admin/app-engine' },
  { label: 'System Settings', icon: IconSettings, path: '/admin/settings' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
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

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened, desktop: !opened } }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} size="sm" />
            <Text size="lg" fw={700} c="blue">Mini ServiceNow</Text>
          </Group>
          <Group>
            <ActionIcon variant="subtle" size="lg" onClick={() => navigate('/approvals')} pos="relative">
              <Indicator disabled={unreadCount === 0} label={unreadCount} size={16} color="red">
                <IconBell size={22} />
              </Indicator>
            </ActionIcon>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar radius="xl" size="sm" color="blue">{user?.first_name?.[0]}{user?.last_name?.[0]}</Avatar>
                    <div>
                      <Text size="sm" fw={500}>{user?.first_name} {user?.last_name}</Text>
                      <Text size="xs" c="dimmed">{user?.roles?.join(', ')}</Text>
                    </div>
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

      <MantineAppShell.Navbar p="xs">
        <ScrollArea>
          <Stack gap={2}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                label={item.label}
                leftSection={<item.icon size={20} />}
                active={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
                onClick={() => navigate(item.path)}
                variant="light"
              />
            ))}
            {isAdmin && (
              <>
                <Text size="xs" fw={700} c="dimmed" mt="md" mb={4} px="sm">Administration</Text>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={<item.icon size={20} />}
                    active={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                    onClick={() => navigate(item.path)}
                    variant="light"
                  />
                ))}
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
