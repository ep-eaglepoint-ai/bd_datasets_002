import nodemailer from 'nodemailer';
// nodemailer: A module for Node.js applications to allow easy email sending.
// Note: The current usage below is synchronous-style and lacks persistence.

export class LegacyMailer {
    private transporter: any;

    constructor(config: any) {
        // BUG: Direct dependency on SMTP configuration during instantiation.
        this.transporter = nodemailer.createTransport(config);
    }

    /**
     * Problem: This method blocks the event loop and has no retry persistence.
     * If the process crashes mid-execution, the notification is lost forever.
     */
    public async sendNotification(to: string, subject: string, body: string) {
        const mailOptions = {
            from: 'noreply@enterprise.com',
            to,
            subject,
            text: body
        };

        try {
            // WARNING: Blocking operation in the main request flow.
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Message sent: %s', info.messageId);
            return { success: true };
        } catch (error) {
            // Problem: No sophisticated retry logic or error categorization.
            console.error('Delivery failed:', error);
            throw error;
        }
    }
}