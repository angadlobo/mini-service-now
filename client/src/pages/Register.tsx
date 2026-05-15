import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Paper, TextInput, PasswordInput, Button, Title, Text, Stack, Center, Alert, Progress, Anchor,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';

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

export function Register() {
  const navigate = useNavigate();
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
    <Center h="100vh" bg="gray.0">
      <Paper shadow="md" p={40} radius="md" w={460}>
        <Stack align="center" mb="lg">
          <Title order={2} c="blue">Mini ServiceNow</Title>
          <Text c="dimmed" size="sm">Create a new account</Text>
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
              placeholder="Choose a username"
              required
              value={form.username}
              onChange={handleChange('username')}
            />
            <TextInput
              label="Email"
              placeholder="your@email.com"
              type="email"
              required
              value={form.email}
              onChange={handleChange('email')}
            />
            <TextInput
              label="First Name"
              placeholder="First name"
              required
              value={form.first_name}
              onChange={handleChange('first_name')}
            />
            <TextInput
              label="Last Name"
              placeholder="Last name"
              required
              value={form.last_name}
              onChange={handleChange('last_name')}
            />
            <PasswordInput
              label="Password"
              placeholder="Create a password"
              required
              value={form.password}
              onChange={handleChange('password')}
            />

            {form.password.length > 0 && (
              <div>
                <Progress value={strength.score} color={strength.color} size="sm" mb={4} />
                <Text size="xs" c={strength.color}>{strength.label}</Text>
              </div>
            )}

            <PasswordInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              required
              value={form.confirm_password}
              onChange={handleChange('confirm_password')}
              error={
                form.confirm_password && form.password !== form.confirm_password
                  ? 'Passwords do not match'
                  : undefined
              }
            />

            <Button type="submit" fullWidth loading={registerMutation.isPending}>
              Create Account
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="lg">
          Already have an account?{' '}
          <Anchor component={Link} to="/login" size="sm">
            Sign in
          </Anchor>
        </Text>
      </Paper>
    </Center>
  );
}
