import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Container, Title, Paper, TextInput, Textarea, NumberInput, Select, MultiSelect, Checkbox, Group, Button, Stack, Text, Loader, Center } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { formsApi } from '../../api/common.api';

function evaluateCondition(condition: any, values: Record<string, any>): boolean {
  if (!condition) return true;
  const { field, operator, value } = condition;
  const fieldVal = values[field];

  switch (operator) {
    case 'equals': return String(fieldVal || '') === String(value || '');
    case 'not_equals': return String(fieldVal || '') !== String(value || '');
    case 'is_empty': return !fieldVal;
    case 'is_not_empty': return !!fieldVal;
    case 'contains': return String(fieldVal || '').toLowerCase().includes(String(value || '').toLowerCase());
    default: return true;
  }
}

export function FormRenderer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, any>>({});

  const { data: template, isLoading } = useQuery({
    queryKey: ['form-template', id],
    queryFn: () => formsApi.get(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: () => formsApi.submit(id!, { data: values }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Form submitted successfully', color: 'green' });
      navigate('/forms');
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to submit form', color: 'red' });
    },
  });

  if (isLoading) return <Center h={400}><Loader /></Center>;
  if (!template) return <Center h={400}><Text>Form not found</Text></Center>;

  const fields = template.fields || [];

  const setValue = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const renderField = (field: any) => {
    // Conditional logic: check if field should be visible
    if (field.conditional_logic && !evaluateCondition(field.conditional_logic, values)) {
      return null;
    }

    const config = field.config || {};
    switch (field.field_type) {
      case 'text':
        return <TextInput key={field.id} label={field.label} required={field.required} placeholder={config.placeholder} value={values[field.name] || ''} onChange={(e) => setValue(field.name, e.target.value)} />;
      case 'textarea':
        return <Textarea key={field.id} label={field.label} required={field.required} rows={4} value={values[field.name] || ''} onChange={(e) => setValue(field.name, e.target.value)} />;
      case 'number':
        return <NumberInput key={field.id} label={field.label} required={field.required} min={config.min} max={config.max} value={values[field.name] || ''} onChange={(val) => setValue(field.name, val)} />;
      case 'date':
        return <TextInput key={field.id} label={field.label} required={field.required} type="date" value={values[field.name] || ''} onChange={(e) => setValue(field.name, e.target.value)} />;
      case 'select':
        return <Select key={field.id} label={field.label} required={field.required} data={(config.options || []).map((o: any) => typeof o === 'string' ? { value: o, label: o } : o)} value={values[field.name] || ''} onChange={(val) => setValue(field.name, val)} />;
      case 'multi_select':
        return <MultiSelect key={field.id} label={field.label} required={field.required} data={(config.options || []).map((o: any) => typeof o === 'string' ? { value: o, label: o } : o)} value={values[field.name] || []} onChange={(val) => setValue(field.name, val)} />;
      case 'checkbox':
        return <Checkbox key={field.id} label={field.label} checked={!!values[field.name]} onChange={(e) => setValue(field.name, e.target.checked)} />;
      case 'radio':
        return <Select key={field.id} label={field.label} required={field.required} data={(config.options || []).map((o: any) => typeof o === 'string' ? { value: o, label: o } : o)} value={values[field.name] || ''} onChange={(val) => setValue(field.name, val)} />;
      case 'reference':
        return <TextInput key={field.id} label={field.label} required={field.required} placeholder={`${config.reference_table || 'record'} ID`} description={config.reference_table ? `Lookup: ${config.reference_table}.${config.reference_display || 'id'}` : undefined} value={values[field.name] || ''} onChange={(e) => setValue(field.name, e.target.value)} />;
      case 'section':
        return <Title key={field.id} order={5} mt="md">{field.label}</Title>;
      default:
        return <TextInput key={field.id} label={field.label} required={field.required} value={values[field.name] || ''} onChange={(e) => setValue(field.name, e.target.value)} />;
    }
  };

  const handleSubmit = () => {
    const visibleRequired = fields.filter((f: any) => {
      if (f.field_type === 'section') return false;
      if (!f.required) return false;
      // Check if field is visible (conditional logic)
      if (f.conditional_logic && !evaluateCondition(f.conditional_logic, values)) return false;
      return !values[f.name];
    });
    if (visibleRequired.length > 0) {
      notifications.show({ title: 'Validation Error', message: `Please fill in: ${visibleRequired.map((f: any) => f.label).join(', ')}`, color: 'orange' });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <Container size="sm">
      <Title order={2} mb="md">{template.name}</Title>
      {template.description && <Text c="dimmed" mb="lg">{template.description}</Text>}
      <Paper p="xl" withBorder className="glass-panel">
        <Stack gap="md">
          {fields.map(renderField)}
          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={() => navigate('/forms')}>Cancel</Button>
            <Button className="gradient-btn" onClick={handleSubmit} loading={submitMutation.isPending}>Submit</Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
