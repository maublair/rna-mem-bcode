# Endpoints de la API RNA

Todos los endpoints (excepto `/health`) esperan el header de autenticación:
`x-api-key: <TU_API_KEY>`

## Sistema
### `GET /health`
- **Desc:** Revisa la conectividad a las bases de datos.
- **Respuesta:** `{ "status": "healthy", ... }`

## Autenticación
### `POST /auth/api-key/generate`
- **Desc:** Genera un API Key (Mock en memoria por ahora).
- **Respuesta:** `{ "api_key": "..." }`

### `POST /auth/login`
- **Desc:** Autenticación para usuarios web.
- **Respuesta:** `{ "token": "..." }`

## Espacios y Hechos
### `GET /v1/spaces`
- **Desc:** Lista todos los espacios jerárquicos desde Neo4j.
- **Respuesta:** `[{ "id": "...", "name": "...", "path": "..." }]`

### `POST /v1/spaces/:id/facts`
- **Desc:** Agrega un nuevo Fact a un espacio.
- **Body:** `{ "content": "...", "type": "NOTE", "tags": [] }`

### `GET /v1/facts`
- **Desc:** Recupera facts. Soporta queries simples.
- **Query:** `space` o `space_id`, `type`, `tag`, `target_agent`, `limit`.

### `POST /v1/facts`
- **Desc:** Agrega un nuevo Fact y crea el espacio si no existe.
- **Body:** `{ "space": "operacional", "content": "...", "type": "note", "tags": [] }`

## Agentes y Memoria Compartida
### `POST /v1/agents/bootstrap`
- **Desc:** Devuelve contexto corto para ahorrar tokens: tareas abiertas y aprendizajes recientes.
- **Body:** `{ "agent_id": "codex", "message": "...", "max_items": 12 }`
- **Respuesta:** `{ "injection": "...", "tasks": [], "learnings": [] }`

### `POST /v1/agents/learn/error`
- **Desc:** Guarda un patrón de error resuelto o pendiente.
- **Body:** `{ "agent_id": "codex", "command": "...", "error": "...", "solution": "..." }`

### `POST /v1/agents/learn/success`
- **Desc:** Guarda un comando o flujo exitoso reutilizable.
- **Body:** `{ "agent_id": "codex", "command": "...", "result": "..." }`

### `POST /v1/agents/suggest`
- **Desc:** Busca aprendizajes relacionados con un error para no resolverlo desde cero.
- **Body:** `{ "error": "..." }`

### `POST /v1/agents/trace`
- **Desc:** Agrega una entrada inmutable a la bitácora del agente.
- **Body:** `{ "agent_id": "codex", "command": "...", "status": "SUCCESS", "result_summary": "...", "duration_ms": 123 }`

### `GET /v1/agents/trace`
- **Desc:** Consulta entradas de bitácora.
- **Query:** `agent_id`, `limit`.

## Transacciones Financieras
### `GET /v1/transactions`
- **Desc:** Recupera transacciones limitadas a las últimas 50.

### `POST /v1/transactions`
- **Desc:** Registra una transacción.
- **Body:** `{ "space_id": "...", "transaction_type": "EXPENSE", "amount": 100, "date": "2026-05-17", "description": "..." }`

## Dispositivos IoT
### `GET /v1/devices/:id/state`
- **Desc:** Obtiene el estado actual reportado de un dispositivo.

### `POST /v1/devices/update`
- **Desc:** Endpoint usado por dispositivos/scripts para reportar estado.
- **Body:** `{ "device_id": "...", "type": "mobile", "metrics": { "battery": 80 }, "timestamp": "..." }`
