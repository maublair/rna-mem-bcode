# RNA (Red de Memoria Anidada) - Core Infrastructure

Este es el stack base del sistema RNA, diseñado para ser el sistema nervioso digital centralizado que maneja la memoria personal, empresarial y operacional.

## Servicios incluidos
- `neo4j`: grafo de conocimiento. (`127.0.0.1:7887`, `127.0.0.1:7576`)
- `qdrant`: memoria vectorial. (`127.0.0.1:6555`)
- `postgres`: transaccional. (`127.0.0.1:5543`)
- `redis`: caché. (`127.0.0.1:6599`)
- `minio`: objetos S3. (`127.0.0.1:9100`, `127.0.0.1:9101`)
- `api`: backend RNA. (`127.0.0.1:3007`)

## Seguridad obligatoria
1. Copiar plantilla segura:
```bash
cp .env.example .env
```
2. Editar `.env` y definir secretos reales:
- `OPENAI_API_KEY`
- `RNA_POSTGRES_PASSWORD`
- `RNA_MINIO_ROOT_PASSWORD`
- `RNA_NEO4J_PASSWORD` (si no usas `RNA_NEO4J_AUTH=none`)

Nunca dejes secretos en `docker-compose.yml`.

## Levantar el entorno
```bash
cd /home/mblair/srv/stacks/rna
docker compose up -d --build
curl http://127.0.0.1:3007/health
```

## `rna-mem-link` para todos los agentes
El cliente está en `skill-client` (`@rna/mem-link`) y usa prioridad de configuración:
1. variables de entorno (`RNA_API_KEY`, `RNA_SERVER_URL`)
2. `/home/mblair/srv/stacks/rna/.rna/config.json`
3. fallback local (`/home/mblair/srv/stacks/rna/.rna`)

Config base recomendada en cada dispositivo:
```json
{
  "device_id": "mauricio-main-server",
  "api_key": "<RNA_API_KEY>",
  "rna_server": "https://rna.bcode.work",
  "sync_interval_ms": 300000,
  "offline_mode": false
}
```

## Regla operativa

- El mirror local canónico es `/home/mblair/srv/stacks/rna/.rna`.
- `~/.rna` solo queda como compatibilidad heredada.
- Los agentes que trabajen en SIA, Ares, RNA o infraestructura deben registrar aprendizaje durable en RNA después de resolver un incidente relevante.
- RNA no es un almacén de secretos: solo aprendizaje, estado operativo, tareas y continuidad.
- RNA debe organizar la información por sesiones, temas y relaciones entre temas.
- Cada agente debe dejar un handoff corto para el siguiente agente o dispositivo.
- El objetivo operativo es ahorrar al menos 80% de tokens en problemas repetidos mediante reutilización de sesiones resumidas, temas relacionados y soluciones ya conocidas.
- La interfaz principal debe priorizar una vista tipo `Memory Atlas` con grafo, sesiones, temas relacionados, y resumen de continuidad antes que listas planas.

## Frontend operativo

El frontend ya funciona como consola de operaciones base, no solo como visor:

- `/dashboard`: vista principal con modo `wiki` y `graph`.
- `/spaces`: mapa del memory palace.
- `/search`: búsqueda unificada de infraestructura.
- `/sync`: monitor de sync, permisos y revisiones.
- `/backups`: snapshot health, restore points y restore rehearsal jobs.
- `/settings`: controles de consola y gobernanza.
- `/admin`: métricas y panel de control.

La vista `/spaces` ya permite:

- listar espacios, colecciones y facts
- crear colecciones
- crear documentos dentro de una colección seleccionada
- inspeccionar documentos reales de la colección
- revisar permisos de colección y revisiones de documentos
- asignar permisos por agente/dispositivo/rol desde la vista de sync
- ver y gestionar cola offline/sync pendiente desde la vista de sync
- revisar salud de snapshots, lanzar snapshot manual y ejecutar restore rehearsals desde la vista de backups
- registrar health snapshots de RNA y ver la última ejecución manual desde la consola
- ver estado del hook `SIA_BACKUP_HOOK` y probarlo de forma controlada desde `/backups`
- habilitar `RNA_RESTORE_EXECUTOR` para los restores `apply` desde el backend, o usar el executor por defecto `scripts/rna-restore.sh`

La visión extendida sigue en `docs/RNA_STRATEGIC_ARCHITECTURE.md` y `docs/COLLECTIONS_AND_MEMORY_PALACE.md`.

## Componentes
- `backend/`: API Node/Express/TypeScript.
- `migrations/`: SQL de bootstrap.
- `scripts/`: carga base de Neo4j.
- `skill-client/`: paquete `@rna/mem-link` para agentes.

## Estado de uso dentro de BlairCode
- RNA queda como stack independiente de memoria e inteligencia auxiliar.
- SIA no debe depender de RNA para memoria básica, sesión ni operación comercial.
- La exposición pública y los cambios de runtime de RNA deben validarse sin afectar SIA.

## Arquitectura estrategica

Ver `docs/RNA_STRATEGIC_ARCHITECTURE.md` para la vision de RNA como cerebro compartido administrado por SIA, con memoria unificada para agentes, ahorro de tokens, frontend de gobierno, auth por dispositivos, despliegue estable y evolucion hacia control de casa.

Ver tambien `docs/COLLECTIONS_AND_MEMORY_PALACE.md` para el modelo de colecciones tipo Firebase, espacios por agente, sala publica, pizarras de tareas, rutinas, empresas, marcas, personal y contabilidad.
