import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Device } from '../../types/infrastructure';
import { useCreateDevice } from '../../hooks/useMutations';

const deviceSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.string().min(1, 'Type required'),
  os: z.string().min(1, 'OS required'),
  os_version: z.string().optional(),
  owner: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

type DeviceFormData = z.infer<typeof deviceSchema>;

interface DeviceFormProps {
  initialData?: Device;
  onSubmit?: (data: Device) => void;
  onCancel?: () => void;
}

export function DeviceForm({ initialData, onSubmit, onCancel }: DeviceFormProps) {
  const mutation = useCreateDevice();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          type: initialData.type,
          os: initialData.os,
          os_version: initialData.os_version,
          owner: initialData.owner,
          location: initialData.location,
          description: initialData.description,
        }
      : {},
  });

  const handleFormSubmit = async (data: DeviceFormData) => {
    try {
      const result = await mutation.mutateAsync(data);
      onSubmit?.(result);
    } catch (error) {
      console.error('Failed to save device:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Name *</label>
        <input
          {...register('name')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          placeholder="W11 PC"
        />
        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Type *</label>
        <input
          {...register('type')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          placeholder="laptop, desktop, phone, etc."
        />
        {errors.type && <p className="text-xs text-red-400 mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">OS *</label>
        <input
          {...register('os')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          placeholder="Windows"
        />
        {errors.os && <p className="text-xs text-red-400 mt-1">{errors.os.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">OS Version</label>
        <input
          {...register('os_version')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          placeholder="11"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Owner</label>
        <input
          {...register('owner')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          placeholder="Mauricio"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
        <input
          {...register('location')}
          type="text"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          placeholder="Home Office"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
        <textarea
          {...register('description')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          placeholder="Device notes..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white text-sm font-semibold py-2 rounded transition"
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
        <p className="text-xs text-red-400">Error saving device</p>
      )}
    </form>
  );
}
