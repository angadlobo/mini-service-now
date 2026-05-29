import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Paper, Text, Group, Box, LoadingOverlay } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { businessServicesApi } from '../../api/service-mapping.api';

const CRITICALITY_COLORS: Record<string, string> = {
  critical: '#e03131',
  high: '#e8590c',
  medium: '#1971c2',
  low: '#868e96',
};

const CRITICALITY_BG: Record<string, string> = {
  critical: '#fff5f5',
  high: '#fff4e6',
  medium: '#e7f5ff',
  low: '#f8f9fa',
};

interface ServiceNode {
  id: string;
  name: string;
  criticality: string;
  status: string;
  dependencies?: { depends_on_id: string }[];
}

function layoutServices(services: ServiceNode[]) {
  const dependencyMap = new Map<string, string[]>();
  services.forEach((s) => {
    const deps = (s.dependencies || []).map((d) => d.depends_on_id);
    dependencyMap.set(s.id, deps);
  });

  const idSet = new Set(services.map((s) => s.id));
  const inDegree = new Map<string, number>();
  services.forEach((s) => inDegree.set(s.id, 0));
  services.forEach((s) => {
    (s.dependencies || []).forEach((d) => {
      if (idSet.has(d.depends_on_id)) {
        inDegree.set(d.depends_on_id, (inDegree.get(d.depends_on_id) || 0) + 1);
      }
    });
  });

  const layers: string[][] = [];
  const placed = new Set<string>();

  while (placed.size < services.length) {
    const layer = services
      .filter((s) => !placed.has(s.id))
      .filter((s) => {
        const deps = dependencyMap.get(s.id) || [];
        return deps.filter((d) => idSet.has(d)).every((d) => placed.has(d));
      })
      .map((s) => s.id);

    if (layer.length === 0) {
      const remaining = services.filter((s) => !placed.has(s.id)).map((s) => s.id);
      layers.push(remaining);
      break;
    }

    layers.push(layer);
    layer.forEach((id) => placed.add(id));
  }

  const nodeWidth = 180;
  const nodeHeight = 50;
  const hGap = 60;
  const vGap = 80;

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, layerIdx) => {
    const totalWidth = layer.length * nodeWidth + (layer.length - 1) * hGap;
    const startX = Math.max(0, (layers.reduce((max, l) => Math.max(max, l.length), 0) * (nodeWidth + hGap) - hGap - totalWidth) / 2);
    layer.forEach((id, idx) => {
      positions.set(id, {
        x: startX + idx * (nodeWidth + hGap),
        y: layerIdx * (nodeHeight + vGap),
      });
    });
  });

  const maxCols = layers.reduce((max, l) => Math.max(max, l.length), 0);
  const svgWidth = Math.max(600, maxCols * (nodeWidth + hGap) - hGap + 40);
  const svgHeight = Math.max(300, layers.length * (nodeHeight + vGap) - vGap + 40);

  return { positions, svgWidth, svgHeight, nodeWidth, nodeHeight };
}

export function ServiceMap() {
  const navigate = useNavigate();

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['service-map'],
    queryFn: () => businessServicesApi.getServiceMap(),
  });

  const services: ServiceNode[] = mapData?.services || mapData || [];
  const serviceMap = new Map<string, ServiceNode>();
  services.forEach((s) => serviceMap.set(s.id, s));

  const { positions, svgWidth, svgHeight, nodeWidth, nodeHeight } = layoutServices(services);

  const arrows: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
  services.forEach((s) => {
    const fromPos = positions.get(s.id);
    if (!fromPos) return;
    (s.dependencies || []).forEach((dep) => {
      const toPos = positions.get(dep.depends_on_id);
      if (!toPos) return;
      arrows.push({
        from: { x: fromPos.x + nodeWidth / 2, y: fromPos.y + nodeHeight },
        to: { x: toPos.x + nodeWidth / 2, y: toPos.y },
      });
    });
  });

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Service Dependency Map</Title>
      </Group>

      <Paper withBorder p="md" pos="relative" style={{ overflow: 'auto' }}>
        <LoadingOverlay visible={isLoading} />
        {services.length === 0 && !isLoading ? (
          <Text c="dimmed" ta="center" py="xl">No services found. Create business services to see the dependency map.</Text>
        ) : (
          <svg width={svgWidth + 40} height={svgHeight + 40} style={{ minWidth: '100%' }}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#868e96" />
              </marker>
            </defs>

            <g transform="translate(20, 20)">
              {arrows.map((arrow, i) => {
                const midY = (arrow.from.y + arrow.to.y) / 2;
                const path = `M ${arrow.from.x} ${arrow.from.y} C ${arrow.from.x} ${midY}, ${arrow.to.x} ${midY}, ${arrow.to.x} ${arrow.to.y}`;
                return (
                  <path
                    key={i}
                    d={path}
                    fill="none"
                    stroke="#868e96"
                    strokeWidth={1.5}
                    markerEnd="url(#arrowhead)"
                    opacity={0.6}
                  />
                );
              })}

              {services.map((s) => {
                const pos = positions.get(s.id);
                if (!pos) return null;
                const borderColor = CRITICALITY_COLORS[s.criticality] || CRITICALITY_COLORS.low;
                const bgColor = CRITICALITY_BG[s.criticality] || CRITICALITY_BG.low;
                return (
                  <g key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/service-mapping/${s.id}`)}>
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={nodeWidth}
                      height={nodeHeight}
                      rx={8}
                      ry={8}
                      fill={bgColor}
                      stroke={borderColor}
                      strokeWidth={2}
                    />
                    <text
                      x={pos.x + nodeWidth / 2}
                      y={pos.y + nodeHeight / 2 - 4}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="#333"
                    >
                      {s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name}
                    </text>
                    <text
                      x={pos.x + nodeWidth / 2}
                      y={pos.y + nodeHeight / 2 + 12}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#666"
                    >
                      {s.criticality}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </Paper>

      <Paper withBorder p="sm">
        <Group gap="lg">
          <Text size="sm" fw={600}>Legend:</Text>
          {Object.entries(CRITICALITY_COLORS).map(([key, color]) => (
            <Group key={key} gap={6}>
              <Box w={16} h={16} style={{ borderRadius: 4, border: `2px solid ${color}`, backgroundColor: CRITICALITY_BG[key] }} />
              <Text size="sm" tt="capitalize">{key}</Text>
            </Group>
          ))}
          <Group gap={6}>
            <svg width={30} height={10}>
              <line x1={0} y1={5} x2={25} y2={5} stroke="#868e96" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
            </svg>
            <Text size="sm">Depends on</Text>
          </Group>
        </Group>
      </Paper>
    </Stack>
  );
}
