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
        const { email, code, type } = req.body;

        if (!email || !code) {
            return res.status(400).json({ error: 'Email and verification code are required' });
        }

        const db = await connectToDatabase();
        const otps = db.collection('otps');
        const users = db.collection('users');

        // Find the OTP
        const otpRecord = await otps.findOne({
            email: email.toLowerCase(),
            code: code.toString(),
            type: type || 'signup',
        });

        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        // Check if OTP has expired (10 minutes)
        const now = new Date();
        const otpAge = (now - otpRecord.createdAt) / 1000 / 60; // in minutes
        if (otpAge > 10) {
            await otps.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }

        // Delete used OTP
        await otps.deleteMany({ email: email.toLowerCase(), type: type || 'signup' });

        if (type === 'reset') {
            // For password reset, generate a short-lived reset token
            const resetToken = jwt.sign(
                { email: email.toLowerCase(), purpose: 'reset' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            return res.status(200).json({
                message: 'Code verified. You can now reset your password.',
                resetToken,
                type: 'reset',
            });
        }

        // For signup, mark user as verified
        await users.updateOne(
            { email: email.toLowerCase() },
            { $set: { verified: true, verifiedAt: new Date() } }
        );

        const user = await users.findOne({ email: email.toLowerCase() });

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: 'Email verified successfully!',
            token,
            user: { name: user.name, email: user.email },
            type: 'signup',
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
