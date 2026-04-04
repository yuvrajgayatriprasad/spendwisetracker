const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');

    const client = new MongoClient(uri);
    await client.connect();

    cachedClient = client;
    cachedDb = client.db('logininfo');

    // Create indexes on first connection
    const otps = cachedDb.collection('otps');
    await otps.createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 }); // Auto-delete OTPs after 10 min
    await otps.createIndex({ email: 1, type: 1 });

    const users = cachedDb.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });

    return cachedDb;
}

module.exports = { connectToDatabase };
