# Esquema de Base de Datos - RNA

El sistema RNA utiliza una arquitectura poli-glota.

## 1. Neo4j (Grafo de Conocimiento)
Gestiona la jerarquía de espacios y relaciones semánticas complejas.

**Nodos Principales:**
- `:Space` (Espacio de memoria jerárquico)
  - `id`: string
  - `name`: string
  - `path`: string
- `:Fact` (Información base almacenada)
  - `id`: string
  - `type`: string
  - `content`: string
  - `created_at`: string

**Relaciones:**
- `(:Space)-[:SUB_SPACE_OF]->(:Space)`
- `(:Fact)-[:IN_SPACE]->(:Space)`

**Índices y Constraints:**
- Unicidad en `id` para `:Space`, `:Fact`, `:Entity`.
- Índices de búsqueda en `s.name`, `f.type`, y `f.created_at`.

## 2. PostgreSQL (Datos Transaccionales y Series de Tiempo)

- `rna_transactions`: Gastos e ingresos. (Índices: date, space_id)
- `rna_tax_events`: Eventos tributarios (SUNAT).
- `rna_devices`: Estado e inventario de dispositivos IoT.
- `rna_execution_traces`: Registros de ejecución y errores de agentes IA.
- `rna_contacts_extended`: Directorio avanzado de contactos con información comercial.

## 3. Qdrant (Búsqueda Vectorial)
Vectores de 768 dimensiones con similitud de Coseno.
- `facts`: Colección principal de memoria.
- `learned-commands`: Órdenes exitosas aprendidas por los agentes.
- `error-patterns`: Patrones de fallos para resoluciones predictivas.
