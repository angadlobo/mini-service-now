import { Paper, Group, Text, Box } from '@mantine/core';
import { TablerIconsProps } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<TablerIconsProps>;
  color?: string;
}

const GRADIENT_MAP: Record<string, string> = {
  red: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
  blue: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  green: 'linear-gradient(135deg, #43e97b, #38f9d7)',
  violet: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  orange: 'linear-gradient(135deg, #f7971e, #ffd200)',
  teal: 'linear-gradient(135deg, #11998e, #38ef7d)',
  cyan: 'linear-gradient(135deg, #667eea, #764ba2)',
  indigo: 'linear-gradient(135deg, #667eea, #764ba2)',
};

function useAnimatedValue(value: number | string): string {
  const [display, setDisplay] = useState<string>(String(value));
  const prevRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const numVal = typeof value === 'number' ? value : parseFloat(String(value));

    // Only animate pure numbers
    if (isNaN(numVal) || String(value) !== String(numVal)) {
      setDisplay(String(value));
      return;
    }

    const from = prevRef.current ?? 0;
    prevRef.current = numVal;
    const diff = numVal - from;
    if (diff === 0) {
      setDisplay(String(numVal));
      return;
    }

    const duration = 600;
    const start = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = from + diff * easedProgress;
      setDisplay(String(Math.round(current)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return display;
}

export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue' }: Props) {
  const gradient = GRADIENT_MAP[color] || GRADIENT_MAP.blue;
  const displayValue = useAnimatedValue(value);

  return (
    <Paper
      p="xl"
      radius={16}
      className="hover-lift"
      style={{
        background: gradient,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        boxShadow: '0 4px 8px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.1)',
      }}
    >
      {/* Watermark icon */}
      <Box
        style={{
          position: 'absolute',
          right: -10,
          bottom: -10,
          opacity: 0.12,
        }}
      >
        <Icon size={96} color="white" />
      </Box>

      <Group justify="space-between" style={{ position: 'relative', zIndex: 1 }}>
        <div>
          <Text size="xs" c="rgba(255,255,255,0.85)" tt="uppercase" fw={700} style={{ letterSpacing: '0.06em', fontSize: '0.7rem' }}>
            {title}
          </Text>
          <Text fw={800} c="white" mt={6} style={{ lineHeight: 1.1, fontSize: '2.1rem' }}>
            {displayValue}
          </Text>
          {subtitle && <Text size="xs" c="rgba(255,255,255,0.72)" mt={6} fw={500}>{subtitle}</Text>}
        </div>
        <Box
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <Icon size={28} color="white" />
        </Box>
      </Group>
    </Paper>
  );
}
