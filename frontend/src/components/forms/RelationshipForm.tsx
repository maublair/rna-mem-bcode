import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Relationship } from '../../types/infrastructure';
import { useCreateRelationship } from '../../hooks/useMutations';
import { useServers, useServices, useDevices } from '../../hooks/useInfrastructure';

const relationshipSchema = z.object({
  source_type: z.enum(['server', 'service', 'device']),
  source_id: z.string().min(1, 'Source required'),
  target_type: z.enum(['server', 'service', 'device']),
  target_id: z.string().min(1, 'Target required'),
  relationship_type: z.enum(['runs_on', 'depends_on', 'connects_to', 'owns', 'manages', 'provides_access_to']),
});

type RelationshipFormData = z.infer<typeof relationshipSchema>;

interface RelationshipFormProps {
  initialData?: Relationship;
  onSubmit?: (data: Relationship) => void;
  onCancel?: () => void;
}

export function RelationshipForm({ initialData, onSubmit, onCancel }: RelationshipFormProps) {
  const mutation = useCreateRelationship();
  const serversQuery = useServers();
  const servicesQuery = useServices();
  const devicesQuery = useDevices();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RelationshipFormData>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: initialData
      ? {
          source_type: initialData.source_type,
          source_id: initialData.source_id,
          target_type: initialData.target_type,
          target_id: initialData.target_id,
          relationship_type: initialData.relationship_type,
        }
      : { source_type: 'server', target_type: 'service', relationship_type: 'runs_on' },
  });

  const sourceType = watch('source_type');
  const targetType = watch('target_type');

  const getSourceOptions = () => {
    switch (sourceType) {
      case 'server':
        return serversQuery.data || [];
      case 'service':
        return servicesQuery.data || [];
      case 'device':
        return devicesQuery.data || [];
    }
  };

  const getTargetOptions = () => {
    switch (targetType) {
      case 'server':
        return serversQuery.data || [];
      case 'service':
        return servicesQuery.data || [];
      case 'device':
        return devicesQuery.data || [];
    }
  };

  const handleFormSubmit = async (data: RelationshipFormData) => {
    try {
      const result = await mutation.mutateAsync(data);
      onSubmit?.(result);
    } catch (error) {
      console.error('Failed to save relationship:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Source Type *</label>
        <select
          {...register('source_type')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="server">Server</option>
          <option value="service">Service</option>
          <option value="device">Device</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Source Entity *</label>
        <select
          {...register('source_id')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">Select {sourceType}...</option>
          {getSourceOptions().map((entity: any) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
        {errors.source_id && <p className="text-xs text-red-400 mt-1">{errors.source_id.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Relationship Type *</label>
        <select
          {...register('relationship_type')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="runs_on">Runs On</option>
          <option value="depends_on">Depends On</option>
          <option value="connects_to">Connects To</option>
          <option value="owns">Owns</option>
          <option value="manages">Manages</option>
          <option value="provides_access_to">Provides Access To</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Target Type *</label>
        <select
          {...register('target_type')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="server">Server</option>
          <option value="service">Service</option>
          <option value="device">Device</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Target Entity *</label>
        <select
          {...register('target_id')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">Select {targetType}...</option>
          {getTargetOptions().map((entity: any) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
        {errors.target_id && <p className="text-xs text-red-400 mt-1">{errors.target_id.message}</p>}
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 text-white text-sm font-semibold py-2 rounded transition"
        >
          {isSubmitting || mutation.isPending ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold py-2 rounded transition"
        >
          Cancel
        </button>
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400">Error creating relationship</p>
      )}
    </form>
  );
}
