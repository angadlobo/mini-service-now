import { FormFlow } from './types';

export const incidentFlow: FormFlow = {
  command: 'incident',
  label: 'Incident',
  steps: [
    {
      field: 'short_description',
      prompt: 'Briefly describe the incident:',
      type: 'text',
      required: true,
      skippable: false,
    },
    {
      field: 'description',
      prompt: 'Provide more details (type "skip" to skip):',
      type: 'text',
      required: false,
      skippable: true,
    },
    {
      field: 'urgency',
      prompt: 'Urgency?\n1 = High\n2 = Medium\n3 = Low',
      type: 'select',
      required: true,
      skippable: false,
      options: [
        { label: '1 - High', value: '1' },
        { label: '2 - Medium', value: '2' },
        { label: '3 - Low', value: '3' },
      ],
    },
    {
      field: 'impact',
      prompt: 'Impact?\n1 = High\n2 = Medium\n3 = Low',
      type: 'select',
      required: true,
      skippable: false,
      options: [
        { label: '1 - High', value: '1' },
        { label: '2 - Medium', value: '2' },
        { label: '3 - Low', value: '3' },
      ],
    },
  ],
};

export const changeFlow: FormFlow = {
  command: 'change',
  label: 'Change Request',
  steps: [
    {
      field: 'short_description',
      prompt: 'Briefly describe the change:',
      type: 'text',
      required: true,
      skippable: false,
    },
    {
      field: 'description',
      prompt: 'Provide more details (type "skip" to skip):',
      type: 'text',
      required: false,
      skippable: true,
    },
    {
      field: 'type',
      prompt: 'Change type?\n1 = Normal\n2 = Standard\n3 = Emergency',
      type: 'select',
      required: true,
      skippable: false,
      options: [
        { label: '1 - Normal', value: 'normal' },
        { label: '2 - Standard', value: 'standard' },
        { label: '3 - Emergency', value: 'emergency' },
      ],
    },
    {
      field: 'risk',
      prompt: 'Risk level?\n1 = Low\n2 = Moderate\n3 = High',
      type: 'select',
      required: true,
      skippable: false,
      options: [
        { label: '1 - Low', value: 'low' },
        { label: '2 - Moderate', value: 'moderate' },
        { label: '3 - High', value: 'high' },
      ],
    },
    {
      field: 'impact',
      prompt: 'Impact level?\n1 = Low\n2 = Moderate\n3 = High',
      type: 'select',
      required: true,
      skippable: false,
      options: [
        { label: '1 - Low', value: 'low' },
        { label: '2 - Moderate', value: 'moderate' },
        { label: '3 - High', value: 'high' },
      ],
    },
    {
      field: 'backout_plan',
      prompt: 'Backout/rollback plan (type "skip" to skip):',
      type: 'text',
      required: false,
      skippable: true,
    },
  ],
};

export const problemFlow: FormFlow = {
  command: 'problem',
  label: 'Problem',
  steps: [
    {
      field: 'short_description',
      prompt: 'Briefly describe the problem:',
      type: 'text',
      required: true,
      skippable: false,
    },
    {
      field: 'description',
      prompt: 'Provide more details (type "skip" to skip):',
      type: 'text',
      required: false,
      skippable: true,
    },
    {
      field: 'priority',
      prompt: 'Priority?\n1 = Critical\n2 = High\n3 = Moderate\n4 = Low\n5 = Planning',
      type: 'select',
      required: true,
      skippable: false,
      options: [
        { label: '1 - Critical', value: '1' },
        { label: '2 - High', value: '2' },
        { label: '3 - Moderate', value: '3' },
        { label: '4 - Low', value: '4' },
        { label: '5 - Planning', value: '5' },
      ],
    },
  ],
};

export const flows: Record<string, FormFlow> = {
  incident: incidentFlow,
  change: changeFlow,
  problem: problemFlow,
};

export function getFlow(command: string): FormFlow | undefined {
  return flows[command];
}
