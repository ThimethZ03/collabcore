const nodemailer = require('nodemailer');

/**
 * Generic email sending function
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!isSmtpConfigured) {
    console.log(`\n======================================================`);
    console.log(`[EMAIL SEND SIMULATION] (SMTP not configured)`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Plain Text: ${text}`);
    console.log(`======================================================\n`);
    return true;
  }

  try {
    const isGmail = process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail.com');
    
    // Configure transporter
    const transporterConfig = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }
      : {
          host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: parseInt(process.env.SMTP_PORT, 10) === 465, // true for 465, false for 587
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        };

    const transporter = nodemailer.createTransport(transporterConfig);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@collabcore.com',
      to,
      subject,
      text,
      html,
    });

    console.log(`[EMAIL SUCCESS] Sent email to ${to}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error);
    return false;
  }
};

/**
 * Helper to send temporary password email
 */
const sendTempPasswordEmail = async (email, fullName, tempPassword) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const subject = 'Welcome to CollabCore - Your Account Details';
  const text = `Hello ${fullName},\n\nYour account has been created on CollabCore.\n\nHere are your login credentials:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in at ${clientUrl} and change your password immediately in your profile.\n\nBest regards,\nCollabCore Team`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563eb;">Welcome to CollabCore!</h2>
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Your account has been created by the coordinator. Here are your login credentials to access the platform:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Email:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Password:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 16px; color: #d97706;">${tempPassword}</td>
        </tr>
      </table>
      <p>Please click the button below to log in and change your password in your settings:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${clientUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to CollabCore</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply directly to this email.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Helper to send OTP verification email
 */
const sendOTPEmail = async (email, fullName, otp) => {
  const subject = 'CollabCore - Password Reset Verification OTP';
  const text = `Hello ${fullName},\n\nYou requested a password reset on CollabCore.\n\nYour 6-digit verification code is: ${otp}\n\nThis OTP is valid for 15 minutes.\n\nBest regards,\nCollabCore Team`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563eb;">Reset Your Password</h2>
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>We received a request to reset the password for your CollabCore account. Use the verification code below to proceed:</p>
      <div style="text-align: center; margin: 30px 0; background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
        <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a;">${otp}</span>
      </div>
      <p>This code is only valid for <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #666;">This is an automated security code. Do not share it with anyone.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

module.exports = { sendEmail, sendTempPasswordEmail, sendOTPEmail };
