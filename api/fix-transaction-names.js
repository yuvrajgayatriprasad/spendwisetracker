const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('./_lib/db');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    // Find all transactions for this user where name is purely numeric (serial numbers)
    const all = await col.find({ userId }).toArray();

    const toFix = all.filter(tx => /^\s*[\d\s\-\/,.:]+\s*$/.test(tx.name || ''));

    if (!toFix.length) {
        return res.status(200).json({ message: 'No transactions with numeric names found', fixed: 0 });
    }

    const ids = toFix.map(tx => tx._id);
    const result = await col.updateMany(
        { _id: { $in: ids }, userId },
        { $set: { name: 'Bank Transaction' } }
    );

    return res.status(200).json({
        message: `Fixed ${result.modifiedCount} transaction(s)`,
        fixed: result.modifiedCount
    });
};
