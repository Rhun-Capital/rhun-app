import { ensureTokenHoldersActivityTableExists, ensureTokenHoldersMappingTableExists } from '../utils/aws-config';

async function initDatabase() {
  console.log('Initializing database tables...');
  
  try {
    // Ensure token holders activity table exists
    const activityTableCreated = await ensureTokenHoldersActivityTableExists();
    console.log(`Token holders activity table ${activityTableCreated ? 'created' : 'already exists'}`);
    
    // Ensure token holders mapping table exists
    const mappingTableCreated = await ensureTokenHoldersMappingTableExists();
    console.log(`Token holders mapping table ${mappingTableCreated ? 'created' : 'already exists'}`);
    
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase(); 