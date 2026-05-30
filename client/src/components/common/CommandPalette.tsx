import { Spotlight, SpotlightActionData } from '@mantine/spotlight';
import { useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import {
  IconDashboard, IconAlertTriangle, IconExchange, IconBug, IconServer,
  IconShoppingCart, IconBook, IconChartBar, IconForms, IconChecklist,
  IconRocket, IconCalendarEvent, IconPlus, IconSearch,
} from '@tabler/icons-react';

function SpotlightContent() {
  const navigate = useNavigate();

  const actions: SpotlightActionData[] = [
    { id: 'dashboard', label: 'Dashboard', description: 'Go to dashboard', leftSection: <IconDashboard size={18} />, onClick: () => navigate('/') },
    { id: 'incidents', label: 'Incidents', description: 'View all incidents', leftSection: <IconAlertTriangle size={18} />, onClick: () => navigate('/incidents') },
    { id: 'changes', label: 'Changes', description: 'View all changes', leftSection: <IconExchange size={18} />, onClick: () => navigate('/changes') },
    { id: 'problems', label: 'Problems', description: 'View all problems', leftSection: <IconBug size={18} />, onClick: () => navigate('/problems') },
    { id: 'releases', label: 'Releases', description: 'View all releases', leftSection: <IconRocket size={18} />, onClick: () => navigate('/releases') },
    { id: 'cmdb', label: 'CMDB', description: 'Configuration items', leftSection: <IconServer size={18} />, onClick: () => navigate('/cmdb') },
    { id: 'catalog', label: 'Service Catalog', description: 'Browse catalog', leftSection: <IconShoppingCart size={18} />, onClick: () => navigate('/catalog') },
    { id: 'knowledge', label: 'Knowledge Base', description: 'Search articles', leftSection: <IconBook size={18} />, onClick: () => navigate('/knowledge') },
    { id: 'reports', label: 'Reports', description: 'View reports', leftSection: <IconChartBar size={18} />, onClick: () => navigate('/reports') },
    { id: 'forms', label: 'Forms', description: 'Form templates', leftSection: <IconForms size={18} />, onClick: () => navigate('/forms') },
    { id: 'approvals', label: 'My Approvals', description: 'Pending approvals', leftSection: <IconChecklist size={18} />, onClick: () => navigate('/approvals') },
    { id: 'change-calendar', label: 'Change Calendar', description: 'View change calendar', leftSection: <IconCalendarEvent size={18} />, onClick: () => navigate('/changes/calendar') },
    { id: 'new-incident', label: 'New Incident', description: 'Create a new incident', leftSection: <IconPlus size={18} />, onClick: () => navigate('/incidents/new') },
    { id: 'new-change', label: 'New Change', description: 'Create a new change', leftSection: <IconPlus size={18} />, onClick: () => navigate('/changes/new') },
    { id: 'new-problem', label: 'New Problem', description: 'Create a new problem', leftSection: <IconPlus size={18} />, onClick: () => navigate('/problems/new') },
    { id: 'new-release', label: 'New Release', description: 'Create a new release', leftSection: <IconPlus size={18} />, onClick: () => navigate('/releases/new') },
  ];

  return (
    <Spotlight
      shortcut={['mod + K']}
      actions={actions}
      nothingFound="No results found"
      searchProps={{
        leftSection: <IconSearch size={18} />,
        placeholder: 'Search pages, actions...',
      }}
    />
  );
}

export function CommandPalette() {
  return (
    <Suspense fallback={null}>
      <SpotlightContent />
    </Suspense>
  );
}
