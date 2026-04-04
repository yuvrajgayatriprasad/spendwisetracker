const { connectToDatabase } = require('./_lib/db');
const { sendOtpEmail } = require('./_lib/email');

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const db = await connectToDatabase();
        const users = db.collection('users');
        const otps = db.collection('otps');

        // Check if user exists
        const user = await users.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal whether user exists - still return success
            return res.status(200).json({
                message: 'If an account exists with this email, a reset code has been sent.',
                email: email.toLowerCase(),
            });
        }

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Remove any existing reset OTPs for this email
        await otps.deleteMany({ email: email.toLowerCase(), type: 'reset' });

        // Store OTP
        await otps.insertOne({
            email: email.toLowerCase(),
            code,
            type: 'reset',
            createdAt: new Date(),
        });

        // Send reset OTP email
        await sendOtpEmail(email.toLowerCase(), code, 'reset');

        return res.status(200).json({
            message: 'If an account exists with this email, a reset code has been sent.',
            email: email.toLowerCase(),
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
