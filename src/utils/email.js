import nodemailer from "nodemailer";

/**
 * Send a verification email to the user using SMTP.
 * 
 * @param {string} email - The recipient's email address.
 * @param {string} code - The verification code (raw, not hashed).
 */
export const sendVerificationCode = async (email, code) => {
  try {
    // Configure the SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // SMTP server hostname (e.g., smtp.example.com)
      port: process.env.SMTP_PORT, // SMTP server port (e.g., 587 for TLS)
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, // SMTP user (set in environment variables)
        pass: process.env.SMTP_PASS, // SMTP password (set in environment variables)
      },
    });

    // Define the email message
    const mailOptions = {
      from: `"Your App Name" <${process.env.SMTP_USER}>`, // Sender address
      to: email, // Recipient email
      subject: "Verification Code", // Subject line
      text: `Your verification code is ${code}. It will expire in 15 minutes.`, // Plain text body
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It will expire in <strong>15 minutes</strong>.</p>`, // HTML body
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Verification code sent to ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};
