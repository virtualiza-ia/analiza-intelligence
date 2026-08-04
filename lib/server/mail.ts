import "server-only";

import nodemailer from "nodemailer";

const requiredSmtpEnvNames = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
] as const;

export type MailMessage = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

export function getMissingSmtpConfig() {
  return requiredSmtpEnvNames.filter((name) => !process.env[name]?.trim());
}

export async function sendMail(message: MailMessage) {
  const missing = getMissingSmtpConfig();

  if (missing.length > 0) {
    throw new Error(`SMTP configuration missing: ${missing.join(", ")}`);
  }

  const port = Number(process.env.SMTP_PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive integer.");
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: process.env.SMTP_PASSWORD,
      user: process.env.SMTP_USER,
    },
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    ...message,
  });
}
