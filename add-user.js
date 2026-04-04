const bcrypt = require('bcryptjs');
const { MongoClient, ServerApiVersion } = require('mongodb');

// Try with admin authSource
const MONGODB_URI = 'mongodb+srv://yuvrajgayatri18_db_user:spendwise1234@spendwise.om4uohh.mongodb.net/?retryWrites=true&w=majority&appName=SPENDWISE';

async function addUser() {
    const client = new MongoClient(MONGODB_URI, {
        serverApi: { version: ServerApiVersion.v1, strict: false },
        serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    console.log('✅ Connected to MongoDB!');

    // Use the logininfo database explicitly after connecting
    const db = client.db('logininfo');
    const users = db.collection('users');

    const existing = await users.findOne({ email: 'yuvrajgayatri18@gmail.com' });
    const hashed = await bcrypt.hash('YUVR1234', 12);

    if (existing) {
        await users.updateOne(
            { email: 'yuvrajgayatri18@gmail.com' },
            { $set: { password: hashed, verified: true, updatedAt: new Date() } }
        );
        console.log('✅ User updated — ready to login!');
    } else {
        await users.insertOne({
            name: 'Yuvraj',
            email: 'yuvrajgayatri18@gmail.com',
            password: hashed,
            verified: true,
            createdAt: new Date(),
        });
        console.log('✅ User created successfully!');
    }

    console.log('\nLogin with:');
    console.log('  Email   : yuvrajgayatri18@gmail.com');
    console.log('  Password: YUVR1234');
    await client.close();
}

addUser().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
