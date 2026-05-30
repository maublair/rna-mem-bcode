import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ConsoleShell } from '../components/layout/ConsoleShell';
import { useCollectionDocsData, useCollectionsData, useFactsData, useSpacesData } from '../hooks/useRNAData';
import { useCreateCollection, useCreateCollectionDoc, useUpdateCollectionDoc } from '../hooks/useRNAMutations';
import { useHealth } from '../hooks/useInfrastructure';
import type { CollectionSummary, DocumentSummary, FactSummary, SpaceSummary } from '../types/infrastructure';

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">{children}</span>;
}

export function SpacesPage() {
  const healthQuery = useHealth();
  const spacesQuery = useSpacesData();
  const collectionsQuery = useCollectionsData();
  const factsQuery = useFactsData({ space: 'operacional', limit: 25 });
  const createCollection = useCreateCollection();
  const [selectedSpace, setSelectedSpace] = useState<string>('operacional');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const spaces = spacesQuery.data || [];
  const collections = collectionsQuery.data || [];
  const facts = factsQuery.data || [];

  const collectionsForSpace = useMemo(
    () => collections.filter((collection) => (collection.space_id ?? collection.id).startsWith(selectedSpace)),
    [collections, selectedSpace]
  );

  const selectedCollectionData = collections.find((collection) => collection.id === selectedCollection);
  const selectedCollectionDocsQuery = useCollectionDocsData(selectedCollection || undefined);
  const docs = selectedCollectionDocsQuery.data || [];
  const createDoc = useCreateCollectionDoc(selectedCollection || '');
  const updateDoc = useUpdateCollectionDoc(editingDocId || '', selectedCollection || '');
  const selectedDoc = docs.find((doc) => doc.id === editingDocId) || null;

  const collectionFormSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    visibility: z.enum(['private', 'shared', 'public', 'admin']).default('shared'),
    owner_type: z.string().default('system'),
  });

  const docFormSchema = z.object({
    type: z.string().min(1),
    title: z.string().optional(),
    content: z.string().optional(),
    tags: z.string().optional(),
  });

  type CollectionFormData = z.infer<typeof collectionFormSchema>;
  type DocFormData = z.infer<typeof docFormSchema>;

  const collectionForm = useForm<CollectionFormData>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      visibility: 'shared',
      owner_type: 'system',
      id: `${selectedSpace}/`,
      name: '',
    },
  });

  const docForm = useForm<DocFormData>({
    resolver: zodResolver(docFormSchema),
    defaultValues: {
      type: 'note',
      title: '',
      content: '',
      tags: '',
    },
  });

  useEffect(() => {
    if (!selectedDoc) {
      return;
    }
    docForm.reset({
      type: selectedDoc.type,
      title: selectedDoc.title || '',
      content: selectedDoc.content || '',
      tags: Array.isArray(selectedDoc.tags) ? selectedDoc.tags.join(', ') : '',
    });
  }, [docForm, selectedDoc]);

  const handleCreateCollection = async (data: CollectionFormData) => {
    await createCollection.mutateAsync({
      id: data.id.trim(),
      space_id: selectedSpace,
      name: data.name.trim(),
      visibility: data.visibility,
      owner_type: data.owner_type,
    });
    collectionForm.reset({ id: `${selectedSpace}/`, name: '', visibility: 'shared', owner_type: 'system' });
  };

  const handleCreateDoc = async (data: DocFormData) => {
    if (!selectedCollection) return;
    await createDoc.mutateAsync({
      type: data.type.trim(),
      title: data.title?.trim() || null,
      content: data.content?.trim() || null,
      tags: data.tags ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
      created_by: 'rna-console',
    });
    docForm.reset({ type: 'note', title: '', content: '', tags: '' });
    setCreatingDoc(false);
  };

  const handleUpdateDoc = async (data: DocFormData) => {
    if (!selectedDoc || !selectedCollection || !editingDocId) return;
    await updateDoc.mutateAsync({
      title: data.title?.trim() || null,
      content: data.content?.trim() || null,
      tags: data.tags ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : null,
      updated_by: 'rna-console',
      change_reason: 'edited-from-console',
    });
    setEditingDocId(null);
    docForm.reset({ type: 'note', title: '', content: '', tags: '' });
  };

  return (
    <ConsoleShell title="Operations Console" subtitle="Spaces" isHealthy={healthQuery.data?.status === 'healthy'}>
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-100">Memory Palace</h2>
          <p className="text-sm text-slate-400 max-w-3xl">
            This is the real surface for spaces and collections. It reflects the Firebase-like structure described in RNA docs.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Spaces</div>
            <div className="mt-2 text-2xl font-semibold">{spaces.length}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Collections</div>
            <div className="mt-2 text-2xl font-semibold">{collections.length}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Facts</div>
            <div className="mt-2 text-2xl font-semibold">{facts.length}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">Health</div>
            <div className="mt-2 text-2xl font-semibold">{healthQuery.data?.status ?? 'unknown'}</div>
          </div>
        </section>

        <div className="space-y-6">
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-4">
            <div className="text-sm font-semibold text-slate-100">Spaces</div>
            <div className="space-y-2">
              {spaces.map((space: SpaceSummary) => (
                <button
                  key={space.id}
                  onClick={() => {
                    setSelectedSpace(space.id);
                    setSelectedCollection(null);
                  }}
                  className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                    selectedSpace === space.id
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                      : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-medium">{space.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{space.path}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Create collection</h3>
                  <p className="text-sm text-slate-400">Create a live collection inside the selected space.</p>
                </div>
              </div>

              <form className="mt-4 grid grid-cols-1 gap-4" onSubmit={collectionForm.handleSubmit(handleCreateCollection)}>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Collection ID</span>
                  <input
                    {...collectionForm.register('id')}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Name</span>
                  <input
                    {...collectionForm.register('name')}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Visibility</span>
                  <select
                    {...collectionForm.register('visibility')}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                  >
                    <option value="private">private</option>
                    <option value="shared">shared</option>
                    <option value="public">public</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner type</span>
                  <input
                    {...collectionForm.register('owner_type')}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                  />
                </label>
                <div className="md:col-span-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={createCollection.isPending}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {createCollection.isPending ? 'Creating...' : 'Create collection'}
                  </button>
                  {createCollection.isError ? <span className="text-sm text-rose-400">Collection creation failed</span> : null}
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Collections in {selectedSpace}</h3>
                  <p className="text-sm text-slate-400">Collections are the live entry points for docs and policy.</p>
                </div>
                <Badge>{collectionsForSpace.length} collections</Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                {collectionsForSpace.map((collection: CollectionSummary) => (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedCollection(collection.id)}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      selectedCollection === collection.id
                        ? 'border-cyan-500/40 bg-cyan-500/10'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-100">{collection.name}</div>
                      <Badge>{collection.visibility}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-mono">{collection.id}</div>
                    <div className="mt-2 text-sm text-slate-400">Owner: {collection.owner_type}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Operational facts</h3>
                  <p className="text-sm text-slate-400">Recent operational memory for the selected space.</p>
                </div>
                <Badge>{facts.length} facts</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {facts.map((fact: FactSummary) => (
                  <article key={fact.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">{fact.type}</div>
                      <div className="text-xs text-slate-500">{new Date(fact.created_at).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{fact.content}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {fact.tags?.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {selectedCollectionData && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="text-lg font-semibold text-slate-100">Selected collection</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                  <div>ID: <span className="text-slate-200 font-mono">{selectedCollectionData.id}</span></div>
                  <div>Space: <span className="text-slate-200">{selectedCollectionData.space_id || 'none'}</span></div>
                  <div>Visibility: <span className="text-slate-200">{selectedCollectionData.visibility}</span></div>
                </div>

                <div className="mt-5 border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-100">Documents</h4>
                    <Badge>{docs.length}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreatingDoc((value) => !value)}
                    className="mt-3 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 hover:border-slate-700"
                  >
                    {creatingDoc ? 'Hide document form' : 'New document'}
                  </button>
                  {creatingDoc && (
                    <form className="mt-4 grid gap-3" onSubmit={docForm.handleSubmit(handleCreateDoc)}>
                      <input
                        {...docForm.register('type')}
                        placeholder="type"
                        className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                      />
                      <input
                        {...docForm.register('title')}
                        placeholder="title"
                        className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                      />
                      <textarea
                        {...docForm.register('content')}
                        placeholder="content"
                        rows={4}
                        className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                      />
                      <input
                        {...docForm.register('tags')}
                        placeholder="tags, comma separated"
                        className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={createDoc.isPending}
                          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {createDoc.isPending ? 'Creating...' : 'Create document'}
                        </button>
                        {createDoc.isError ? <span className="text-sm text-rose-400">Document creation failed</span> : null}
                      </div>
                    </form>
                  )}
                  <div className="mt-4 space-y-3">
                    {docs.map((doc: DocumentSummary) => (
                      <article key={doc.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-100">{doc.title || doc.type}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-slate-500">v{doc.version}</div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDocId(doc.id);
                                setCreatingDoc(false);
                              }}
                              className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-cyan-500/40"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-400/80">{doc.type}</div>
                        <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{doc.content || 'No content'}</div>
                        {doc.tags?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {doc.tags.map((tag) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  {selectedDoc && (
                    <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-100">Edit document</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDocId(null);
                            docForm.reset({ type: 'note', title: '', content: '', tags: '' });
                          }}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-600"
                        >
                          Close
                        </button>
                      </div>

                      <form className="mt-4 grid gap-3" onSubmit={docForm.handleSubmit(handleUpdateDoc)}>
                        <input
                          value={selectedDoc.type}
                          disabled
                          className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-500"
                        />
                        <input
                          {...docForm.register('title')}
                          placeholder="title"
                          className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                        />
                        <textarea
                          {...docForm.register('content')}
                          placeholder="content"
                          rows={4}
                          className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                        />
                        <input
                          {...docForm.register('tags')}
                          placeholder="tags, comma separated"
                          className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            type="submit"
                            disabled={updateDoc.isPending}
                            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            {updateDoc.isPending ? 'Saving...' : 'Save changes'}
                          </button>
                          {updateDoc.isError ? <span className="text-sm text-rose-400">Update failed</span> : null}
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </ConsoleShell>
  );
}
