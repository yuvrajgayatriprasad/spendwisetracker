const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('./_lib/db');

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const db = await connectToDatabase();
        const users = db.collection('users');

        // Find user
        const user = await users.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'No account found with this email address' });
        }

        // Check if verified
        if (!user.verified) {
            return res.status(403).json({
                error: 'Please verify your email first',
                needsVerification: true,
                email: user.email,
            });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: { name: user.name, email: user.email },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
