import { Device, Server, Service } from '../../types/infrastructure';

interface WikiViewProps {
  servers: Server[];
  services: Service[];
  devices: Device[];
}

export function WikiView({ servers, services, devices }: WikiViewProps) {
  return (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-indigo-400 mb-4">Servers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <div key={server.id} className="p-4 bg-slate-900 border border-indigo-500 rounded-lg">
              <h3 className="font-bold text-indigo-300">{server.name}</h3>
              <p className="text-sm text-slate-400">{server.os}</p>
              <p className="text-xs text-slate-500 mt-2">{server.environment}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className="p-4 bg-slate-900 border border-cyan-500 rounded-lg">
              <h3 className="font-bold text-cyan-300">{service.name}</h3>
              <p className="text-sm text-slate-400">{service.type}</p>
              <span className={`inline-block text-xs mt-2 px-2 py-1 rounded ${
                service.status === 'running' ? 'bg-green-900 text-green-200' :
                service.status === 'stopped' ? 'bg-red-900 text-red-200' :
                'bg-gray-700 text-gray-200'
              }`}>
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">Devices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div key={device.id} className="p-4 bg-slate-900 border border-emerald-500 rounded-lg">
              <h3 className="font-bold text-emerald-300">{device.name}</h3>
              <p className="text-sm text-slate-400">{device.os}</p>
              {device.owner && <p className="text-xs text-slate-500">Owner: {device.owner}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
