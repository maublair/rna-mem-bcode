import { useServers, useServices, useDevices } from '../../hooks/useInfrastructure';

export function Sidebar() {
  const serversQuery = useServers();
  const servicesQuery = useServices();
  const devicesQuery = useDevices();

  const servers = serversQuery.data || [];
  const services = servicesQuery.data || [];
  const devices = devicesQuery.data || [];

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.24em]">Servers</h2>
          <span className="text-[11px] text-slate-500">{servers.length}</span>
        </div>
        <div className="mt-3 space-y-1">
          {servers.map((server) => (
            <div
              key={server.id}
              className="text-sm text-slate-200 px-3 py-2 rounded-xl cursor-pointer transition-colors hover:bg-white/5 border border-transparent hover:border-white/10"
            >
              {server.name}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.24em]">Services</h2>
          <span className="text-[11px] text-slate-500">{services.length}</span>
        </div>
        <div className="mt-3 space-y-1">
          {services.map((service) => (
            <div
              key={service.id}
              className="text-sm text-slate-200 px-3 py-2 rounded-xl cursor-pointer transition-colors hover:bg-white/5 border border-transparent hover:border-white/10"
            >
              {service.name}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.24em]">Devices</h2>
          <span className="text-[11px] text-slate-500">{devices.length}</span>
        </div>
        <div className="mt-3 space-y-1">
          {devices.map((device) => (
            <div
              key={device.id}
              className="text-sm text-slate-200 px-3 py-2 rounded-xl cursor-pointer transition-colors hover:bg-white/5 border border-transparent hover:border-white/10"
            >
              {device.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
