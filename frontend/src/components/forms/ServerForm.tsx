import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Server } from '../../types/infrastructure';
import { useCreateServer } from '../../hooks/useMutations';

const serverSchema = z.object({
  name: z.string().min(1, 'Name required'),
  os: z.string().min(1, 'OS required'),
  os_version: z.string().optional(),
  ip: z.string().optional(),
  ssh_port: z.coerce.number().optional(),
  location: z.string().optional(),
  environment: z.enum(['production', 'staging', 'development']),
  description: z.string().optional(),
});

type ServerFormData = z.infer<typeof serverSchema>;

interface ServerFormProps {
  initialData?: Server;
  onSubmit?: (data: Server) => void;
  onCancel?: () => void;
}

export function ServerForm({ initialData, onSubmit, onCancel }: ServerFormProps) {
  const mutation = useCreateServer();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          os: initialData.os,
          os_version: initialData.os_version,
          ip: initialData.ip,
          ssh_port: initialData.ssh_port,
          location: initialData.location,
          environment: initialData.environment,
          description: initialData.description,
        }
      : { environment: 'production' },
  });

  const handleFormSubmit = async (data: ServerFormData) => {
    try {
      const result = await mutation.mutateAsync(data);
      onSubmit?.(result);
    } catch (error) {
      console.error('Failed to save server:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Name *</label>
        <input
          {...register('name')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="bcode-work"
        />
        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">OS *</label>
        <input
          {...register('os')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="Ubuntu"
        />
        {errors.os && <p className="text-xs text-red-400 mt-1">{errors.os.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">OS Version</label>
        <input
          {...register('os_version')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="20.04"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">IP Address</label>
        <input
          {...register('ip')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="192.168.1.1"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">SSH Port</label>
        <input
          {...register('ssh_port')}
          type="number"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="22"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
        <input
          {...register('location')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="Data Center A"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Environment *</label>
        <select
          {...register('environment')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
        <textarea
          {...register('description')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="Server notes..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white text-sm font-semibold py-2 rounded transition"
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
        <p className="text-xs text-red-400">Error saving server</p>
      )}
    </form>
  );
}
