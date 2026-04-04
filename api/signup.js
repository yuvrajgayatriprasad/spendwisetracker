const bcrypt = require('bcryptjs');
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
        const { name, email, password } = req.body;

        // Validate inputs
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const db = await connectToDatabase();
        const users = db.collection('users');
        const otps = db.collection('otps');

        // Check if user already exists
        const existingUser = await users.findOne({ email: email.toLowerCase() });
        if (existingUser && existingUser.verified) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        // If user exists but is not verified, update their info
        const hashedPassword = await bcrypt.hash(password, 12);

        if (existingUser && !existingUser.verified) {
            await users.updateOne(
                { email: email.toLowerCase() },
                { $set: { name, password: hashedPassword, updatedAt: new Date() } }
            );
        } else {
            await users.insertOne({
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                verified: false,
                createdAt: new Date(),
            });
        }

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Remove any existing OTPs for this email
        await otps.deleteMany({ email: email.toLowerCase() });

        // Store OTP
        await otps.insertOne({
            email: email.toLowerCase(),
            code,
            type: 'signup',
            createdAt: new Date(),
        });

        // Send OTP email
        await sendOtpEmail(email.toLowerCase(), code, 'signup');

        return res.status(200).json({
            message: 'Account created! Please check your email for the verification code.',
            email: email.toLowerCase(),
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
