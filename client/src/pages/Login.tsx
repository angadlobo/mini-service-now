import { useState } from 'react';
import { Paper, TextInput, PasswordInput, Button, Title, Text, Stack, Center, Box, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { appName, logoUrl } = useUiStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login({ username, password });
      setAuth(data.user, data.accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center
      h="100vh"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d1b69 40%, #1a1a2e 70%, #0f3443 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Floating background shapes */}
      {!window.matchMedia('(prefers-reduced-motion: reduce)').matches && (
        <>
          <Box
            className="floating-shape"
            style={{
              top: '10%', left: '10%',
              width: 300, height: 300,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
            }}
          />
          <Box
            className="floating-shape"
            style={{
              top: '60%', right: '5%',
              width: 200, height: 200,
              background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
            }}
          />
          <Box
            className="floating-shape"
            style={{
              bottom: '10%', left: '30%',
              width: 250, height: 250,
              background: 'linear-gradient(135deg, #f7971e, #ffd200)',
            }}
          />
        </>
      )}

      <Paper
        p={40}
        radius="xl"
        w={420}
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Stack align="center" mb="xl">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'contain' }} />
          ) : (
            <Box
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.5)',
              }}
            >
              <Text size="xl" fw={800} c="white">{appName.charAt(0)}</Text>
            </Box>
          )}
          <Title order={2} c="white" style={{ letterSpacing: '-0.5px' }}>{appName}</Title>
          <Text c="rgba(255,255,255,0.6)" size="sm">Sign in to your account</Text>
        </Stack>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" variant="light" radius="md">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label={<Text size="sm" c="rgba(255,255,255,0.7)">Username</Text>}
              placeholder="Enter username"
              required
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              styles={{
                input: {
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  '&::placeholder': { color: 'rgba(255,255,255,0.4)' },
                },
              }}
            />
            <PasswordInput
              label={<Text size="sm" c="rgba(255,255,255,0.7)">Password</Text>}
              placeholder="Enter password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              styles={{
                input: {
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="md"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              }}
            >
              Sign In
            </Button>
          </Stack>
        </form>

        <Text c="rgba(255,255,255,0.4)" size="xs" ta="center" mt="lg">
          Demo: admin/admin123, itil.user/itil123, end.user/user123
        </Text>
        <Text size="sm" ta="center" mt="sm">
          <Text component="span" c="rgba(255,255,255,0.5)" inherit>Don't have an account? </Text>
          <Text component={Link} to="/register" c="rgba(255,255,255,0.9)" inherit fw={500}>
            Register
          </Text>
        </Text>
      </Paper>
    </Center>
  );
}
