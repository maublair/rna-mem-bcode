import { Device, Server, Service } from '../../types/infrastructure';

interface WikiViewProps {
  servers: Server[];
  services: Service[];
  devices: Device[];
  onSelectEntity?: (type: string, id: string) => void;
}

export function WikiView({ servers, services, devices, onSelectEntity }: WikiViewProps) {
  return (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-indigo-400 mb-4">Servers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <button
              key={server.id}
              onClick={() => onSelectEntity?.('server', server.id)}
              className="text-left p-4 bg-slate-900 border border-indigo-500 rounded-lg hover:bg-slate-800 hover:border-indigo-400 transition cursor-pointer"
            >
              <h3 className="font-bold text-indigo-300">{server.name}</h3>
              <p className="text-sm text-slate-400">{server.os}</p>
              <p className="text-xs text-slate-500 mt-2">{server.environment}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => onSelectEntity?.('service', service.id)}
              className="text-left p-4 bg-slate-900 border border-cyan-500 rounded-lg hover:bg-slate-800 hover:border-cyan-400 transition cursor-pointer"
            >
              <h3 className="font-bold text-cyan-300">{service.name}</h3>
              <p className="text-sm text-slate-400">{service.type}</p>
              <span className={`inline-block text-xs mt-2 px-2 py-1 rounded ${
                service.status === 'running' ? 'bg-green-900 text-green-200' :
                service.status === 'stopped' ? 'bg-red-900 text-red-200' :
                'bg-gray-700 text-gray-200'
              }`}>
                {service.status}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">Devices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => onSelectEntity?.('device', device.id)}
              className="text-left p-4 bg-slate-900 border border-emerald-500 rounded-lg hover:bg-slate-800 hover:border-emerald-400 transition cursor-pointer"
            >
              <h3 className="font-bold text-emerald-300">{device.name}</h3>
              <p className="text-sm text-slate-400">{device.os}</p>
              {device.owner && <p className="text-xs text-slate-500">Owner: {device.owner}</p>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
