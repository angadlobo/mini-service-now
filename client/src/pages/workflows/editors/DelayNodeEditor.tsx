import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, Select, NumberInput } from '@mantine/core';

export interface DelayNodeConfig {
  duration_minutes?: number;
  duration_unit?: string;
  duration_value?: number;
}

interface DelayNodeEditorProps {
  opened: boolean;
  onClose: () => void;
  config: DelayNodeConfig;
  onChange: (config: DelayNodeConfig) => void;
}

const UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
];

function toMinutes(value: number, unit: string): number {
  switch (unit) {
    case 'hours': return value * 60;
    case 'days': return value * 60 * 24;
    default: return value;
  }
}

export function DelayNodeEditor({ opened, onClose, config, onChange }: DelayNodeEditorProps) {
  const [value, setValue] = useState(config.duration_value || config.duration_minutes || 5);
  const [unit, setUnit] = useState(config.duration_unit || 'minutes');

  useEffect(() => {
    if (opened) {
      setValue(config.duration_value || config.duration_minutes || 5);
      setUnit(config.duration_unit || 'minutes');
    }
  }, [opened, config]);

  const handleApply = () => {
    onChange({
      duration_value: value,
      duration_unit: unit,
      duration_minutes: toMinutes(value, unit),
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configure Delay" size="sm">
      <Stack>
        <NumberInput
          label="Duration"
          placeholder="Enter duration"
          value={value}
          onChange={(v) => setValue(Number(v) || 1)}
          min={1}
        />

        <Select
          label="Unit"
          data={UNIT_OPTIONS}
          value={unit}
          onChange={(v) => setUnit(v || 'minutes')}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
