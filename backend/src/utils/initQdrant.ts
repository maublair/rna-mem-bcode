import qdrant from '../services/qdrantService.js';

async function initQdrant() {
  try {
    const collections = await qdrant.getCollections();
    const collectionNames = collections.collections.map((c: any) => c.name);

    if (!collectionNames.includes('facts')) {
      await qdrant.createCollection('facts', {
        vectors: { size: 768, distance: 'Cosine' }
      });
      console.log('Created Qdrant collection: facts');
    }

    if (!collectionNames.includes('learned-commands')) {
      await qdrant.createCollection('learned-commands', {
        vectors: { size: 768, distance: 'Cosine' }
      });
      console.log('Created Qdrant collection: learned-commands');
    }

    if (!collectionNames.includes('error-patterns')) {
      await qdrant.createCollection('error-patterns', {
        vectors: { size: 768, distance: 'Cosine' }
      });
      console.log('Created Qdrant collection: error-patterns');
    }

  } catch (error) {
    console.error('Error initializing Qdrant collections:', error);
  }
}

export default initQdrant;
