 import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "Nest <onboarding@resend.dev>";

export async function sendVerificationEmail({ to, name, verificationUrl }) {
  if (!resend) {
    console.log("Email not sent. Missing RESEND_API_KEY.");
    return { skipped: true };
  }

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Verify your Nest account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to Nest${name ? `, ${name}` : ""}</h2>
        <p>Please verify your email address to activate your account.</p>
        <p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#020617;text-decoration:none;border-radius:10px;font-weight:bold;">
            Verify my account
          </a>
        </p>
        <p>If the button does not work, copy and paste this link:</p>
        <p>${verificationUrl}</p>
      </div>
    `,
  });
}