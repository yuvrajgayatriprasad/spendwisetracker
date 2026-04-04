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
        const { email, type } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const db = await connectToDatabase();
        const otps = db.collection('otps');

        // Generate new 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Remove any existing OTPs for this email+type
        await otps.deleteMany({ email: email.toLowerCase(), type: type || 'signup' });

        // Store new OTP
        await otps.insertOne({
            email: email.toLowerCase(),
            code,
            type: type || 'signup',
            createdAt: new Date(),
        });

        // Send OTP email
        await sendOtpEmail(email.toLowerCase(), code, type || 'signup');

        return res.status(200).json({
            message: 'A new verification code has been sent to your email.',
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
