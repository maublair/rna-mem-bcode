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
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase mb-2">Servers</h2>
        <div className="space-y-1">
          {servers.map((server) => (
            <div key={server.id} className="text-sm text-slate-300 p-2 hover:bg-slate-800 rounded cursor-pointer">
              {server.name}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase mb-2">Services</h2>
        <div className="space-y-1">
          {services.map((service) => (
            <div key={service.id} className="text-sm text-slate-300 p-2 hover:bg-slate-800 rounded cursor-pointer">
              {service.name}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase mb-2">Devices</h2>
        <div className="space-y-1">
          {devices.map((device) => (
            <div key={device.id} className="text-sm text-slate-300 p-2 hover:bg-slate-800 rounded cursor-pointer">
              {device.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
