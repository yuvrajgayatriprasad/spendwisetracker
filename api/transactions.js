const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('./_lib/db');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Verify JWT
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ error: 'Unauthorized' });

    let userId;
    try {
        const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
        userId = decoded.userId;
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const db = await connectToDatabase();
    const col = db.collection('transactions');

    // GET: fetch user's transactions
    if (req.method === 'GET') {
        try {
            const txs = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
            return res.status(200).json({ transactions: txs });
        } catch (err) {
            console.error('GET transactions error:', err);
            return res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    }

    // POST: save new transactions
    if (req.method === 'POST') {
        try {
            const { transactions } = req.body;
            if (!Array.isArray(transactions) || !transactions.length)
                return res.status(400).json({ error: 'No transactions provided' });

            const docs = transactions.map(tx => ({
                name:     tx.name     || 'Transaction',
                date:     tx.date     || new Date().toLocaleDateString(),
                amount:   Number(tx.amount) || 0,
                cat:      tx.cat      || 'Other',
                catClass: tx.catClass || 'groceries',
                icon:     tx.icon     || 'receipt',
                time:     tx.time     || 'Imported',
                method:   tx.method   || 'Bank Import',
                userId,
                createdAt: new Date(),
            }));

            await col.insertMany(docs);
            return res.status(200).json({ message: `${docs.length} transaction(s) saved`, count: docs.length });
        } catch (err) {
            console.error('POST transactions error:', err);
            return res.status(500).json({ error: 'Failed to save transactions' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
