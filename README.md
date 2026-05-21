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
2. `~/.rna/config.json`
3. fallback local (`~/.rna`)

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

## Componentes
- `backend/`: API Node/Express/TypeScript.
- `migrations/`: SQL de bootstrap.
- `scripts/`: carga base de Neo4j.
- `skill-client/`: paquete `@rna/mem-link` para agentes.

## Estado de uso dentro de BlairCode
- RNA queda como stack independiente de memoria e inteligencia auxiliar.
- SIA no debe depender de RNA para memoria básica, sesión ni operación comercial.
- La exposición pública y los cambios de runtime de RNA deben validarse sin afectar SIA.
