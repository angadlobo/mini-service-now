import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, TextInput, Select, Group, Button, Paper, LoadingOverlay, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { knowledgeApi } from '../../api/knowledge.api';

export function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [state, setState] = useState('draft');

  const { data: article, isLoading } = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => knowledgeApi.get(id!),
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: knowledgeApi.listCategories,
  });

  const editor = useEditor({
    extensions: [StarterKit, Underline, Highlight, Link],
    content: '',
  });

  useEffect(() => {
    if (article && editor) {
      setTitle(article.title);
      setCategoryId(article.category_id || null);
      setState(article.state);
      editor.commands.setContent(article.body || '');
    }
  }, [article, editor]);

  const save = useMutation({
    mutationFn: () => {
      const body = editor?.getHTML() || '';
      if (isNew) {
        return knowledgeApi.create({ title, body, category_id: categoryId } as any);
      }
      return knowledgeApi.update(id!, { title, body, category_id: categoryId, state } as any);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Article created' : 'Article updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      if (isNew) navigate(`/knowledge/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['kb-article', id] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const categoryOptions = categories.map((c: any) => ({ value: c.id, label: c.name }));

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/knowledge')}>Back</Button>
        <Title order={2}>{isNew ? 'New Article' : 'Edit Article'}</Title>
      </Group>

      <Paper withBorder p="md" pos="relative">
        <LoadingOverlay visible={isLoading} />
        <Stack>
          <TextInput label="Title" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} />

          <Group>
            <Select label="Category" data={categoryOptions} value={categoryId} onChange={setCategoryId} clearable w={250} />
            {!isNew && (
              <Select label="State" data={[
                { value: 'draft', label: 'Draft' },
                { value: 'review', label: 'Review' },
                { value: 'published', label: 'Published' },
                { value: 'retired', label: 'Retired' },
              ]} value={state} onChange={(v) => setState(v || 'draft')} w={200} />
            )}
          </Group>

          <RichTextEditor editor={editor}>
            <RichTextEditor.Toolbar sticky stickyOffset={60}>
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Bold />
                <RichTextEditor.Italic />
                <RichTextEditor.Underline />
                <RichTextEditor.Strikethrough />
                <RichTextEditor.Highlight />
                <RichTextEditor.Code />
              </RichTextEditor.ControlsGroup>
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.H1 />
                <RichTextEditor.H2 />
                <RichTextEditor.H3 />
              </RichTextEditor.ControlsGroup>
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Blockquote />
                <RichTextEditor.Hr />
                <RichTextEditor.BulletList />
                <RichTextEditor.OrderedList />
              </RichTextEditor.ControlsGroup>
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Link />
                <RichTextEditor.Unlink />
              </RichTextEditor.ControlsGroup>
            </RichTextEditor.Toolbar>
            <RichTextEditor.Content />
          </RichTextEditor>

          <Group justify="flex-end">
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
              {isNew ? 'Create' : 'Save'}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
