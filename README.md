# RNA (Red de Memoria Anidada) - Core Infrastructure

Este es el stack base del sistema RNA, diseñado para ser el sistema nervioso digital centralizado que maneja la memoria personal, empresarial y operacional.

## Servicios Incluidos
El stack de Docker Compose (`/srv/stacks/rna/docker-compose.yml`) incluye:
- **neo4j:** Base de datos de grafos para entidades y relaciones. (Puertos: 7887 Bolt, 7576 HTTP)
- **qdrant:** Base de datos vectorial para búsqueda semántica. (Puerto: 6555)
- **postgres:** Base de datos relacional para transacciones y eventos. (Puerto: 5543)
- **redis:** Caché en memoria. (Puerto: 6599)
- **minio:** Almacenamiento de objetos compatible con S3. (Puertos: 9100, 9101)
- **api:** Backend principal en Node.js/Express. (Puerto: 3007)

## Cómo levantar el entorno

1. Navega al directorio del stack:
   ```bash
   cd /home/mblair/srv/stacks/rna/
   ```

2. Ejecuta Docker Compose:
   ```bash
   docker compose up -d
   ```
   *(La API compilará los cambios en TypeScript de ser necesario mediante el comando `npm run build` en su Dockerfile).*

3. Verifica la salud:
   ```bash
   curl http://localhost:3007/health
   ```
   Deberías recibir:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "services": {
       "postgres": "up",
       "neo4j": "up",
       "qdrant": "up"
     }
   }
   ```

## Componentes

- `/backend`: Código fuente de la API (Node.js, Express, TypeScript).
- `/migrations`: Scripts SQL de inicialización para PostgreSQL.
- `/scripts`: Scripts Cypher para poblar Neo4j.
- `/skill-client`: Módulo npm `@rna/mem-link` que sirve como cliente para agentes de IA.
