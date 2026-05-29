import { useQuery } from '@tanstack/react-query';
import {
  Stack, Title, Text, SimpleGrid, Card, Group, Alert, Badge, Paper,
  ThemeIcon, Box, LoadingOverlay, Divider,
} from '@mantine/core';
import {
  IconAlertCircle, IconAlertTriangle, IconUrgent, IconTool,
  IconBug, IconShoppingCart, IconBook, IconTicket,
  IconExternalLink, IconInfoCircle, IconBell,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { portalApi } from '../../api/portal.api';

const ANNOUNCEMENT_CONFIG: Record<string, { color: string; icon: typeof IconInfoCircle }> = {
  info: { color: 'blue', icon: IconInfoCircle },
  warning: { color: 'yellow', icon: IconAlertTriangle },
  critical: { color: 'red', icon: IconUrgent },
  maintenance: { color: 'orange', icon: IconTool },
};

const glassStyle = {
  background: 'rgba(255,255,255,0.65)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

export function PortalHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-home'],
    queryFn: portalApi.getHome,
  });

  const announcements = data?.announcements || [];
  const quickLinks = data?.quickLinks || [];
  const myTicketCount = data?.myTicketCount || 0;

  const quickActions = [
    {
      label: 'Report an Issue',
      description: 'Submit a new incident for IT support',
      icon: IconBug,
      color: 'red',
      path: '/portal/submit-incident',
    },
    {
      label: 'Request Something',
      description: 'Browse the service catalog',
      icon: IconShoppingCart,
      color: 'violet',
      path: '/catalog',
    },
    {
      label: 'Search Knowledge Base',
      description: 'Find answers and articles',
      icon: IconBook,
      color: 'blue',
      path: '/knowledge',
    },
    {
      label: 'My Tickets',
      description: `${myTicketCount} open ticket${myTicketCount !== 1 ? 's' : ''}`,
      icon: IconTicket,
      color: 'green',
      path: '/portal/my-tickets',
    },
  ];

  return (
    <Stack className="fade-in">
      {/* Banner / Greeting */}
      <Paper
        p="xl"
        radius="lg"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Title order={2} mb={4}>
          Welcome back, {user?.first_name || user?.username || 'User'}
        </Title>
        <Text size="md" style={{ opacity: 0.85 }}>
          How can we help you today? Use the quick actions below or browse our services.
        </Text>
      </Paper>

      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={isLoading} />

        {/* Announcements */}
        {announcements.length > 0 && (
          <Stack mb="lg">
            <Group gap="xs">
              <IconBell size={20} />
              <Title order={4}>Announcements</Title>
            </Group>
            {announcements.map((a: any) => {
              const cfg = ANNOUNCEMENT_CONFIG[a.type] || ANNOUNCEMENT_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <Alert
                  key={a.id}
                  color={cfg.color}
                  icon={<Icon size={20} />}
                  title={a.title}
                  radius="md"
                  variant="light"
                >
                  {a.body && <Text size="sm">{a.body}</Text>}
                </Alert>
              );
            })}
          </Stack>
        )}

        {/* Quick Actions */}
        <Stack mb="lg">
          <Title order={4}>Quick Actions</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.label}
                  padding="lg"
                  radius="lg"
                  className="hover-lift"
                  style={{ ...glassStyle, cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onClick={() => navigate(action.path)}
                >
                  <Group mb="xs">
                    <ThemeIcon variant="light" size="xl" radius="md" color={action.color}>
                      <Icon size={24} />
                    </ThemeIcon>
                  </Group>
                  <Text fw={600} size="md" mb={4}>{action.label}</Text>
                  <Text size="sm" c="dimmed">{action.description}</Text>
                </Card>
              );
            })}
          </SimpleGrid>
        </Stack>

        {/* Quick Links */}
        {quickLinks.length > 0 && (
          <Stack>
            <Title order={4}>Quick Links</Title>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
              {quickLinks.map((link: any) => (
                <Card
                  key={link.id}
                  padding="md"
                  radius="md"
                  style={{ ...glassStyle, cursor: 'pointer', transition: 'all 0.2s ease' }}
                  className="hover-lift"
                  onClick={() => {
                    if (link.url.startsWith('/')) {
                      navigate(link.url);
                    } else {
                      window.open(link.url, '_blank');
                    }
                  }}
                >
                  <Group>
                    <ThemeIcon variant="light" size="lg" radius="md" color="gray">
                      <IconExternalLink size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500} size="sm">{link.label}</Text>
                      {link.category && (
                        <Badge variant="light" size="xs" color="gray">{link.category}</Badge>
                      )}
                    </div>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
