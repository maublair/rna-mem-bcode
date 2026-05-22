import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Service } from '../../types/infrastructure';
import { useCreateService } from '../../hooks/useMutations';

const serviceSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.string().min(1, 'Type required'),
  port: z.coerce.number().optional(),
  protocol: z.string().optional(),
  status: z.enum(['running', 'stopped', 'error', 'unknown']),
  description: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  initialData?: Service;
  onSubmit?: (data: Service) => void;
  onCancel?: () => void;
}

export function ServiceForm({ initialData, onSubmit, onCancel }: ServiceFormProps) {
  const mutation = useCreateService();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          type: initialData.type,
          port: initialData.port,
          protocol: initialData.protocol,
          status: initialData.status,
          description: initialData.description,
        }
      : { status: 'running' },
  });

  const handleFormSubmit = async (data: ServiceFormData) => {
    try {
      const result = await mutation.mutateAsync(data);
      onSubmit?.(result);
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Name *</label>
        <input
          {...register('name')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
          placeholder="API Server"
        />
        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Type *</label>
        <input
          {...register('type')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
          placeholder="web, database, cache, etc."
        />
        {errors.type && <p className="text-xs text-red-400 mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Port</label>
        <input
          {...register('port')}
          type="number"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
          placeholder="3005"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Protocol</label>
        <input
          {...register('protocol')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
          placeholder="HTTP, TCP, etc."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Status *</label>
        <select
          {...register('status')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
        >
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
          <option value="error">Error</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
        <textarea
          {...register('description')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
          placeholder="Service notes..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white text-sm font-semibold py-2 rounded transition"
        >
          {isSubmitting || mutation.isPending ? 'Saving...' : 'Save'}
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
        <p className="text-xs text-red-400">Error saving service</p>
      )}
    </form>
  );
}
