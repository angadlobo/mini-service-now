import { Component, ReactNode } from 'react';
import { Stack, Title, Text, Button, Group, Code, Paper, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconHome } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
  /** When this value changes, the boundary resets (e.g. pass the route path). */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors in a subtree so one broken page shows a recoverable
 * message instead of blanking the entire app. Resets automatically when `resetKey`
 * changes (we pass the current route), so navigating away clears the error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <Stack align="center" justify="center" mih="60vh" px="md">
          <Paper p="xl" radius="lg" withBorder maw={560} w="100%">
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" color="red" variant="light">
                <IconAlertTriangle size={30} />
              </ThemeIcon>
              <Title order={3}>This page hit a snag</Title>
              <Text c="dimmed" ta="center" size="sm">
                Something went wrong rendering this screen. The rest of the app is still fine —
                you can retry or head back to the dashboard.
              </Text>
              <Code block w="100%" style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>
                {this.state.error.message}
              </Code>
              <Group mt="xs">
                <Button leftSection={<IconRefresh size={16} />} onClick={() => this.setState({ error: null })}>
                  Retry
                </Button>
                <Button variant="default" leftSection={<IconHome size={16} />} onClick={() => { window.location.href = '/'; }}>
                  Go to Dashboard
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      );
    }
    return this.props.children;
  }
}
