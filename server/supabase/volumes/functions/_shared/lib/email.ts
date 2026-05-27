import nodemailer from "nodemailer";
import { env } from "./env.ts";
import { getAdminClient } from "./supabase.ts";

export type TemplateVars = Record<string, string>;

export function renderTemplate(template: string, vars: TemplateVars): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value ?? "");
  }
  return out;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const auth =
      env.smtpUser && env.smtpPass
        ? { user: env.smtpUser, pass: env.smtpPass }
        : undefined;
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: false,
      auth,
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

export async function loadTemplate(templateKey: string): Promise<{
  subject: string;
  body_html: string;
  body_text: string | null;
} | null> {
  const db = getAdminClient();
  const { data } = await db
    .from("email_templates")
    .select("subject,body_html,body_text")
    .eq("template_key", templateKey)
    .maybeSingle();
  return data;
}

export async function sendSmtpMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const from = env.smtpSenderName
    ? `${env.smtpSenderName} <${env.smtpFrom}>`
    : env.smtpFrom;
  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, " "),
  });
}

export async function sendTemplatedEmail(
  to: string,
  templateKey: string,
  vars: TemplateVars,
): Promise<void> {
  const tpl = await loadTemplate(templateKey);
  if (!tpl) throw new Error(`Unknown template: ${templateKey}`);
  const subject = renderTemplate(tpl.subject, vars);
  const html = renderTemplate(tpl.body_html, vars);
  const text = tpl.body_text ? renderTemplate(tpl.body_text, vars) : undefined;
  await sendSmtpMail({ to, subject, html, text });
}

export async function processEmailOutbox(batch = 20): Promise<{ sent: number; failed: number }> {
  const db = getAdminClient();
  const { data: rows } = await db
    .from("email_outbox")
    .select("*")
    .eq("status", "pending")
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(batch);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const payload = (row.payload ?? {}) as Record<string, string>;
    try {
      await sendTemplatedEmail(row.to_email, row.template_key, payload);
      await db
        .from("email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
        .eq("id", row.id);
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await db
        .from("email_outbox")
        .update({
          status: row.attempts >= 4 ? "failed" : "pending",
          attempts: (row.attempts ?? 0) + 1,
          error_message: msg,
        })
        .eq("id", row.id);
      failed++;
      console.error("[email]", row.id, msg);
    }
  }

  return { sent, failed };
}
