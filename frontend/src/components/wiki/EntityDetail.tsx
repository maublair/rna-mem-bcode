import { X } from 'lucide-react';
import { Server, Service, Device } from '../../types/infrastructure';

interface EntityDetailProps {
  entityType: string;
  data: Server | Service | Device;
  onClose: () => void;
}

export function EntityDetail({ entityType, data, onClose }: EntityDetailProps) {
  const isServer = (d: any): d is Server => d.os !== undefined && d.osVersion !== undefined;
  const isService = (d: any): d is Service => d.type !== undefined && d.port !== undefined;
  const isDevice = (d: any): d is Device => d.deviceType !== undefined;

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-100">{data.name}</h2>
          <p className="text-xs text-slate-400 capitalize">{entityType}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded transition"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-3">Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">ID</span>
              <span className="text-slate-200 font-mono">{data.id}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Type</span>
              <span className="text-slate-200 capitalize">{entityType}</span>
            </div>
          </div>
        </div>

        {/* Server-specific */}
        {isServer(data) && (
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3">Server Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">OS</span>
                <span className="text-slate-200">{data.os}</span>
              </div>
              {data.os_version && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Version</span>
                  <span className="text-slate-200">{data.os_version}</span>
                </div>
              )}
              {data.ip && (
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Address</span>
                  <span className="text-slate-200 font-mono">{data.ip}</span>
                </div>
              )}
              {data.ssh_port && (
                <div className="flex justify-between">
                  <span className="text-slate-400">SSH Port</span>
                  <span className="text-slate-200">{data.ssh_port}</span>
                </div>
              )}
              {data.location && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Location</span>
                  <span className="text-slate-200">{data.location}</span>
                </div>
              )}
              {data.environment && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment</span>
                  <span className="text-slate-200 capitalize">{data.environment}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service-specific */}
        {isService(data) && (
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3">Service Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Type</span>
                <span className="text-slate-200 capitalize">{data.type}</span>
              </div>
              {data.port && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Port</span>
                  <span className="text-slate-200">{data.port}</span>
                </div>
              )}
              {data.protocol && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Protocol</span>
                  <span className="text-slate-200 uppercase">{data.protocol}</span>
                </div>
              )}
              {data.status && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={`capitalize ${data.status === 'running' ? 'text-green-400' : data.status === 'stopped' ? 'text-red-400' : 'text-amber-400'}`}>
                    {data.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Device-specific */}
        {isDevice(data) && (
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3">Device Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Device Type</span>
                <span className="text-slate-200 capitalize">{data.type}</span>
              </div>
              {data.os && (
                <div className="flex justify-between">
                  <span className="text-slate-400">OS</span>
                  <span className="text-slate-200">{data.os}</span>
                </div>
              )}
              {data.os_version && (
                <div className="flex justify-between">
                  <span className="text-slate-400">OS Version</span>
                  <span className="text-slate-200">{data.os_version}</span>
                </div>
              )}
              {data.owner && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner</span>
                  <span className="text-slate-200">{data.owner}</span>
                </div>
              )}
              {data.location && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Location</span>
                  <span className="text-slate-200">{data.location}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 flex-shrink-0">
        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded transition">
          Edit
        </button>
      </div>
    </div>
  );
}
