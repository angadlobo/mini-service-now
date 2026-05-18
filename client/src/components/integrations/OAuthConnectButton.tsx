import { useState } from 'react';
import { Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLink } from '@tabler/icons-react';
import { integrationsApi } from '../../api/common.api';

interface OAuthConnectButtonProps {
  integrationId: string;
  connected: boolean;
  onConnected?: () => void;
}

export function OAuthConnectButton({ integrationId, connected, onConnected }: OAuthConnectButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/api/integrations/oauth/callback`;
      const { authorizationUrl } = await integrationsApi.startOAuth(integrationId, redirectUri);

      // Open OAuth flow in a popup
      const popup = window.open(authorizationUrl, 'oauth', 'width=600,height=700');

      // Poll for popup close
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer);
          setLoading(false);
          onConnected?.();
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(timer);
        setLoading(false);
      }, 300000);
    } catch (err: any) {
      setLoading(false);
      notifications.show({
        title: 'OAuth Error',
        message: err.response?.data?.error || err.message || 'Failed to start OAuth flow',
        color: 'red',
      });
    }
  };

  return (
    <Button
      variant={connected ? 'light' : 'filled'}
      color={connected ? 'green' : 'blue'}
      leftSection={<IconLink size={16} />}
      onClick={handleConnect}
      loading={loading}
    >
      {connected ? 'Reconnect OAuth' : 'Connect with OAuth'}
    </Button>
  );
}
