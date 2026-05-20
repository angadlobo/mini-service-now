import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ActionIcon, Paper, Text, TextInput, Stack, Group, Box, ScrollArea, Transition, Loader,
} from '@mantine/core';
import { IconMessageChatbot, IconX, IconSend } from '@tabler/icons-react';
import { aiApi } from '../../api/common.api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await aiApi.chat(text, location.pathname);
      const assistantMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', text: result.text };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorText = err.response?.data?.error || 'Unable to get a response. Make sure an AI provider is configured in Admin > AI Providers.';
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', text: errorText }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating action button */}
      <ActionIcon
        size={56}
        radius="xl"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          background: 'var(--gradient-primary)',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          border: 'none',
          transition: 'all 0.3s ease',
        }}
      >
        {open ? <IconX size={24} color="white" /> : <IconMessageChatbot size={24} color="white" />}
      </ActionIcon>

      {/* Chat panel */}
      <Transition mounted={open} transition="slide-up" duration={300}>
        {(styles) => (
          <Paper
            style={{
              ...styles,
              position: 'fixed',
              bottom: 92,
              right: 24,
              zIndex: 999,
              width: 380,
              height: 500,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
            }}
            radius="lg"
          >
            {/* Header */}
            <Box
              px="md"
              py="sm"
              style={{
                background: 'var(--gradient-primary)',
                flexShrink: 0,
              }}
            >
              <Group justify="space-between">
                <Group gap="xs">
                  <IconMessageChatbot size={20} color="white" />
                  <Text fw={600} c="white" size="sm">AI Assistant</Text>
                </Group>
                <ActionIcon variant="subtle" size="sm" onClick={() => setOpen(false)} style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            </Box>

            {/* Messages */}
            <ScrollArea
              style={{ flex: 1 }}
              viewportRef={scrollRef}
              px="md"
              py="sm"
            >
              {messages.length === 0 && (
                <Stack align="center" justify="center" style={{ height: '100%', minHeight: 200 }}>
                  <IconMessageChatbot size={40} style={{ opacity: 0.2 }} />
                  <Text size="sm" c="dimmed" ta="center">
                    Ask me anything about incidents, changes, workflows, or IT service management.
                  </Text>
                </Stack>
              )}
              <Stack gap="sm">
                {messages.map((msg) => (
                  <Box
                    key={msg.id}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      marginLeft: msg.role === 'user' ? 'auto' : 0,
                      marginRight: msg.role === 'user' ? 0 : 'auto',
                    }}
                  >
                    <Paper
                      px="sm"
                      py="xs"
                      radius="lg"
                      style={{
                        background: msg.role === 'user'
                          ? 'var(--gradient-primary)'
                          : 'var(--msn-border-subtle)',
                        color: msg.role === 'user' ? 'white' : 'inherit',
                      }}
                    >
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.text}
                      </Text>
                    </Paper>
                  </Box>
                ))}
                {loading && (
                  <Group gap="xs" ml={4}>
                    <Loader size="xs" />
                    <Text size="xs" c="dimmed">Thinking...</Text>
                  </Group>
                )}
              </Stack>
            </ScrollArea>

            {/* Input */}
            <Box px="md" py="sm" style={{ borderTop: '1px solid var(--msn-border-subtle)', flexShrink: 0 }}>
              <Group gap="xs">
                <TextInput
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  style={{ flex: 1 }}
                  size="sm"
                  radius="xl"
                />
                <ActionIcon
                  size="lg"
                  radius="xl"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  style={{
                    background: input.trim() ? 'var(--gradient-primary)' : undefined,
                    border: 'none',
                  }}
                  variant={input.trim() ? 'filled' : 'light'}
                >
                  <IconSend size={16} color={input.trim() ? 'white' : undefined} />
                </ActionIcon>
              </Group>
            </Box>
          </Paper>
        )}
      </Transition>
    </>
  );
}
