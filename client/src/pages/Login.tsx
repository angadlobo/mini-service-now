import { useState } from 'react';
import { Paper, TextInput, PasswordInput, Button, Title, Text, Stack, Center, Box, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
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
    <Center h="100vh" bg="gray.0">
      <Paper shadow="md" p={40} radius="md" w={420}>
        <Stack align="center" mb="lg">
          <Title order={2} c="blue">Mini ServiceNow</Title>
          <Text c="dimmed" size="sm">Sign in to your account</Text>
        </Stack>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" variant="light">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Username"
              placeholder="Enter username"
              required
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              placeholder="Enter password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <Button type="submit" fullWidth loading={loading}>
              Sign In
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="xs" ta="center" mt="lg">
          Demo: admin/admin123, itil.user/itil123, end.user/user123
        </Text>
        <Text size="sm" ta="center" mt="sm">
          Don't have an account?{' '}
          <Text component={Link} to="/register" c="blue" inherit>
            Register
          </Text>
        </Text>
      </Paper>
    </Center>
  );
}
