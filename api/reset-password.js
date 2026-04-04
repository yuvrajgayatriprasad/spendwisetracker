const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('./_lib/db');

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: 'Reset token and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Verify reset token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired reset link. Please try again.' });
        }

        if (decoded.purpose !== 'reset') {
            return res.status(401).json({ error: 'Invalid reset token' });
        }

        const db = await connectToDatabase();
        const users = db.collection('users');

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user's password
        const result = await users.updateOne(
            { email: decoded.email },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            message: 'Password reset successfully! You can now sign in with your new password.',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
