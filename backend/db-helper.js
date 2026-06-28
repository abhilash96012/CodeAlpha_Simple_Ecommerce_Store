const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error('Error creating data directory:', err);
    }
  }
}

// Get path to table file
function getTablePath(table) {
  return path.join(DATA_DIR, `${table}.json`);
}

// Read table data
async function readTable(table) {
  await ensureDataDir();
  const filePath = getTablePath(table);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If file doesn't exist, return empty array
    if (err.code === 'ENOENT') {
      return [];
    }
    console.error(`Error reading table ${table}:`, err);
    return [];
  }
}

// Write table data
async function writeTable(table, data) {
  await ensureDataDir();
  const filePath = getTablePath(table);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing table ${table}:`, err);
    return false;
  }
}

// Helper to generate a unique random ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

module.exports = {
  // Get all records in a table
  async getAll(table) {
    return await readTable(table);
  },

  // Get a single record by ID
  async getById(table, id) {
    const data = await readTable(table);
    return data.find(item => item.id === id) || null;
  },

  // Find a single record by query criteria
  async findOne(table, predicate) {
    const data = await readTable(table);
    return data.find(predicate) || null;
  },

  // Find multiple records by query criteria
  async findMany(table, predicate) {
    const data = await readTable(table);
    return data.filter(predicate);
  },

  // Insert a new record
  async insert(table, record) {
    const data = await readTable(table);
    const newRecord = {
      id: generateId(),
      ...record,
      createdAt: new Date().toISOString()
    };
    data.push(newRecord);
    await writeTable(table, data);
    return newRecord;
  },

  // Update a record by ID
  async update(table, id, updates) {
    const data = await readTable(table);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;

    data[index] = {
      ...data[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await writeTable(table, data);
    return data[index];
  },

  // Delete a record by ID
  async delete(table, id) {
    const data = await readTable(table);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return false;

    data.splice(index, 1);
    await writeTable(table, data);
    return true;
  }
};
