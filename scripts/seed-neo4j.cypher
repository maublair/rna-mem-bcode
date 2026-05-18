// Constraints and Indexes
CREATE CONSTRAINT space_id IF NOT EXISTS FOR (s:Space) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT fact_id IF NOT EXISTS FOR (f:Fact) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;

CREATE INDEX space_name IF NOT EXISTS FOR (s:Space) ON (s.name);
CREATE INDEX fact_type IF NOT EXISTS FOR (f:Fact) ON (f.type);
CREATE INDEX fact_created IF NOT EXISTS FOR (f:Fact) ON (f.created_at);

// Seed Spaces
MERGE (p:Space {id: 'personal', name: 'Personal', path: 'personal/'})
MERGE (e:Space {id: 'empresarial', name: 'Empresarial', path: 'empresarial/'})
MERGE (o:Space {id: 'operacional', name: 'Operacional', path: 'operacional/'})
MERGE (k:Space {id: 'conocimiento', name: 'Conocimiento Compartido', path: 'conocimiento-compartido/'})

// Initial Facts in personal/yo/notas
MERGE (yo:Space {id: 'personal:yo', name: 'Yo', path: 'personal/yo/'})
MERGE (yo)-[:SUB_SPACE_OF]->(p)

MERGE (n1:Fact {id: 'fact_seed_1', type: 'NOTE', content: 'RNA Proyecto iniciado el 2026-05-17', created_at: '2026-05-17T12:00:00Z'})
MERGE (n1)-[:IN_SPACE]->(yo)

MERGE (n2:Fact {id: 'fact_seed_2', type: 'NOTE', content: 'F25: Infraestructura base en progreso', created_at: '2026-05-17T12:05:00Z'})
MERGE (n2)-[:IN_SPACE]->(yo)
