const { Resend } = require('resend');

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY environment variable is not set');
    return new Resend(apiKey);
}

async function sendOtpEmail(email, code, type = 'signup') {
    const resend = getResend();

    const isReset = type === 'reset';
    const subject = isReset ? 'Reset Your SpendWise Password' : 'Verify Your SpendWise Account';
    const heading = isReset ? 'Password Reset Code' : 'Email Verification Code';
    const message = isReset
        ? 'You requested to reset your password. Use the code below to proceed:'
        : 'Welcome to SpendWise! Please verify your email address with the code below:';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
            <div style="background:linear-gradient(135deg,#4338CA,#3730A3);padding:32px 24px;text-align:center;">
                <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <span style="color:white;font-size:24px;">💰</span>
                </div>
                <h1 style="color:white;font-size:22px;margin:0 0 4px;">SpendWise</h1>
                <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">Smart Financial Management</p>
            </div>
            <div style="padding:32px 28px;text-align:center;">
                <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">${heading}</h2>
                <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">${message}</p>
                <div style="background:#f8f9ff;border:2px dashed #4338CA;border-radius:12px;padding:20px;margin:0 0 24px;">
                    <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#4338CA;">${code}</span>
                </div>
                <p style="color:#9ca3af;font-size:12px;margin:0;">This code expires in <strong>10 minutes</strong>.</p>
                <p style="color:#9ca3af;font-size:12px;margin:8px 0 0;">If you didn't request this, please ignore this email.</p>
            </div>
            <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="color:#9ca3af;font-size:11px;margin:0;">&copy; 2026 SpendWise. Built for modern financial freedom.</p>
            </div>
        </div>
    </body>
    </html>`;

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'SpendWise <onboarding@resend.dev>';

    await resend.emails.send({
        from: fromEmail,
        to: email,
        subject,
        html,
    });
}

module.exports = { sendOtpEmail };
