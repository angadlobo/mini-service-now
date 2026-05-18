import { TextInput, PasswordInput, Select, Switch, Textarea, Stack } from '@mantine/core';

interface FieldDefinition {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

interface ProviderConfigFormProps {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

export function ProviderConfigForm({ fields, values, onChange }: ProviderConfigFormProps) {
  const updateField = (name: string, value: unknown) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <Stack gap="sm">
      {fields.map((field) => {
        const val = values[field.name] ?? field.defaultValue ?? '';

        switch (field.type) {
          case 'password':
            return (
              <PasswordInput
                key={field.name}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
                description={field.description}
                value={String(val)}
                onChange={(e) => updateField(field.name, e.currentTarget.value)}
              />
            );
          case 'select':
            return (
              <Select
                key={field.name}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
                description={field.description}
                data={field.options || []}
                value={String(val)}
                onChange={(v) => updateField(field.name, v || '')}
              />
            );
          case 'boolean':
            return (
              <Switch
                key={field.name}
                label={field.label}
                description={field.description}
                checked={!!val}
                onChange={(e) => updateField(field.name, e.currentTarget.checked)}
              />
            );
          case 'textarea':
            return (
              <Textarea
                key={field.name}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
                description={field.description}
                value={String(val)}
                onChange={(e) => updateField(field.name, e.currentTarget.value)}
                minRows={3}
              />
            );
          case 'url':
          case 'text':
          default:
            return (
              <TextInput
                key={field.name}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
                description={field.description}
                value={String(val)}
                onChange={(e) => updateField(field.name, e.currentTarget.value)}
              />
            );
        }
      })}
    </Stack>
  );
}
