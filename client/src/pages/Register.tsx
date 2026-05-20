import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Paper, TextInput, PasswordInput, Button, Title, Text, Stack, Center, Alert, Progress, Box,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useUiStore } from '../store/ui';

function getPasswordStrength(password: string): { score: number; color: string; label: string } {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 20;
  if (/[^a-zA-Z0-9]/.test(password)) score += 25;

  if (score <= 25) return { score, color: 'red', label: 'Weak' };
  if (score <= 50) return { score, color: 'orange', label: 'Fair' };
  if (score <= 75) return { score, color: 'yellow', label: 'Good' };
  return { score: Math.min(score, 100), color: 'green', label: 'Strong' };
}

const inputStyles = {
  input: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
  },
};

export function Register() {
  const navigate = useNavigate();
  const { appName, logoUrl } = useUiStore();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState('');

  const strength = getPasswordStrength(form.password);

  const registerMutation = useMutation({
    mutationFn: () => {
      const { confirm_password, ...payload } = form;
      return authApi.register(payload);
    },
    onSuccess: () => {
      navigate('/login', { state: { message: 'Registration successful. Please sign in.' } });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Registration failed');
    },
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    registerMutation.mutate();
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
              background: 'var(--gradient-primary)',
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
        w={460}
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 1,
          maxHeight: '90vh',
          overflowY: 'auto',
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
          <Text c="rgba(255,255,255,0.6)" size="sm">Create a new account</Text>
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
              placeholder="Choose a username"
              required
              value={form.username}
              onChange={handleChange('username')}
              styles={inputStyles}
            />
            <TextInput
              label={<Text size="sm" c="rgba(255,255,255,0.7)">Email</Text>}
              placeholder="your@email.com"
              type="email"
              required
              value={form.email}
              onChange={handleChange('email')}
              styles={inputStyles}
            />
            <TextInput
              label={<Text size="sm" c="rgba(255,255,255,0.7)">First Name</Text>}
              placeholder="First name"
              required
              value={form.first_name}
              onChange={handleChange('first_name')}
              styles={inputStyles}
            />
            <TextInput
              label={<Text size="sm" c="rgba(255,255,255,0.7)">Last Name</Text>}
              placeholder="Last name"
              required
              value={form.last_name}
              onChange={handleChange('last_name')}
              styles={inputStyles}
            />
            <PasswordInput
              label={<Text size="sm" c="rgba(255,255,255,0.7)">Password</Text>}
              placeholder="Create a password"
              required
              value={form.password}
              onChange={handleChange('password')}
              styles={inputStyles}
            />

            {form.password.length > 0 && (
              <div>
                <Progress value={strength.score} color={strength.color} size="sm" mb={4} />
                <Text size="xs" c={strength.color}>{strength.label}</Text>
              </div>
            )}

            <PasswordInput
              label={<Text size="sm" c="rgba(255,255,255,0.7)">Confirm Password</Text>}
              placeholder="Re-enter your password"
              required
              value={form.confirm_password}
              onChange={handleChange('confirm_password')}
              error={
                form.confirm_password && form.password !== form.confirm_password
                  ? 'Passwords do not match'
                  : undefined
              }
              styles={inputStyles}
            />

            <Button
              type="submit"
              fullWidth
              loading={registerMutation.isPending}
              size="md"
              style={{
                background: 'var(--gradient-primary)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              }}
            >
              Create Account
            </Button>
          </Stack>
        </form>

        <Text size="sm" ta="center" mt="lg">
          <Text component="span" c="rgba(255,255,255,0.5)" inherit>Already have an account? </Text>
          <Text component={Link} to="/login" c="rgba(255,255,255,0.9)" inherit fw={500}>
            Sign in
          </Text>
        </Text>
      </Paper>
    </Center>
  );
}
