'use server';

import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResend() {
    if (!resendInstance && process.env.RESEND_API_KEY) {
        resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
}

interface EmailPayload {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export async function sendEmailAction({ to, subject, text, html }: EmailPayload) {
    try {
        const resend = getResend();
        if (!resend) {
            console.warn('⚠️ RESEND_API_KEY is not set. Email not sent.');
            // Allow success in dev if key missing, to not block UI
            return { success: true, warning: 'Missing API Key' };
        }

        const fromEmail = process.env.EMAIL_FROM || 'Almuerzo.cl <quiero@almuerzo.cl>';

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [to],
            subject: subject,
            text: text,
            html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`,
        });

        if (error) {
            console.error('Resend Error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error('Server Action Error:', err);
        return { success: false, error: err.message };
    }
}
