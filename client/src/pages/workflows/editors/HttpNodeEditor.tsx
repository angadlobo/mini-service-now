import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, TextInput, Select, Textarea, NumberInput, JsonInput } from '@mantine/core';

export interface HttpNodeConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  auth?: { type: string; token?: string; username?: string; password?: string; header_name?: string; api_key?: string };
  timeout?: number;
  store_response_in?: string;
}

interface HttpNodeEditorProps {
  opened: boolean;
  onClose: () => void;
  config: HttpNodeConfig;
  onChange: (config: HttpNodeConfig) => void;
}

const METHOD_OPTIONS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

const AUTH_TYPE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api_key', label: 'API Key' },
];

export function HttpNodeEditor({ opened, onClose, config, onChange }: HttpNodeEditorProps) {
  const [url, setUrl] = useState(config.url || '');
  const [method, setMethod] = useState(config.method || 'GET');
  const [headers, setHeaders] = useState(JSON.stringify(config.headers || {}, null, 2));
  const [body, setBody] = useState(config.body || '');
  const [authType, setAuthType] = useState(config.auth?.type || 'none');
  const [authToken, setAuthToken] = useState(config.auth?.token || '');
  const [authUsername, setAuthUsername] = useState(config.auth?.username || '');
  const [authPassword, setAuthPassword] = useState(config.auth?.password || '');
  const [authHeaderName, setAuthHeaderName] = useState(config.auth?.header_name || 'X-API-Key');
  const [authApiKey, setAuthApiKey] = useState(config.auth?.api_key || '');
  const [timeout, setTimeout_] = useState(config.timeout || 30000);
  const [storeResponseIn, setStoreResponseIn] = useState(config.store_response_in || 'http_response');

  useEffect(() => {
    if (opened) {
      setUrl(config.url || '');
      setMethod(config.method || 'GET');
      setHeaders(JSON.stringify(config.headers || {}, null, 2));
      setBody(config.body || '');
      setAuthType(config.auth?.type || 'none');
      setAuthToken(config.auth?.token || '');
      setAuthUsername(config.auth?.username || '');
      setAuthPassword(config.auth?.password || '');
      setAuthHeaderName(config.auth?.header_name || 'X-API-Key');
      setAuthApiKey(config.auth?.api_key || '');
      setTimeout_(config.timeout || 30000);
      setStoreResponseIn(config.store_response_in || 'http_response');
    }
  }, [opened, config]);

  const handleApply = () => {
    let parsedHeaders: Record<string, string> = {};
    try { parsedHeaders = JSON.parse(headers); } catch { /* use empty */ }

    const auth = authType === 'none' ? undefined : {
      type: authType,
      token: authToken,
      username: authUsername,
      password: authPassword,
      header_name: authHeaderName,
      api_key: authApiKey,
    };

    onChange({
      url,
      method,
      headers: parsedHeaders,
      body: body || undefined,
      auth,
      timeout,
      store_response_in: storeResponseIn,
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configure HTTP Request" size="lg">
      <Stack>
        <Group grow>
          <Select label="Method" data={METHOD_OPTIONS} value={method} onChange={(v) => setMethod(v || 'GET')} />
          <TextInput label="URL" placeholder="https://api.example.com/endpoint" value={url}
            onChange={(e) => setUrl(e.currentTarget.value)} style={{ flex: 2 }} />
        </Group>

        <JsonInput
          label="Headers (JSON)"
          placeholder='{"Content-Type": "application/json"}'
          value={headers}
          onChange={setHeaders}
          minRows={3}
          formatOnBlur
        />

        {['POST', 'PUT', 'PATCH'].includes(method) && (
          <Textarea
            label="Body"
            placeholder="Request body (supports {{record.field}} templates)"
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            minRows={4}
          />
        )}

        <Select label="Authentication" data={AUTH_TYPE_OPTIONS} value={authType}
          onChange={(v) => setAuthType(v || 'none')} />

        {authType === 'bearer' && (
          <TextInput label="Bearer Token" value={authToken} onChange={(e) => setAuthToken(e.currentTarget.value)} />
        )}
        {authType === 'basic' && (
          <Group grow>
            <TextInput label="Username" value={authUsername} onChange={(e) => setAuthUsername(e.currentTarget.value)} />
            <TextInput label="Password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.currentTarget.value)} />
          </Group>
        )}
        {authType === 'api_key' && (
          <Group grow>
            <TextInput label="Header Name" value={authHeaderName} onChange={(e) => setAuthHeaderName(e.currentTarget.value)} />
            <TextInput label="API Key" value={authApiKey} onChange={(e) => setAuthApiKey(e.currentTarget.value)} />
          </Group>
        )}

        <Group grow>
          <NumberInput label="Timeout (ms)" value={timeout} onChange={(v) => setTimeout_(Number(v) || 30000)} min={1000} max={120000} />
          <TextInput label="Store Response As" placeholder="http_response" value={storeResponseIn}
            onChange={(e) => setStoreResponseIn(e.currentTarget.value)} />
        </Group>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
