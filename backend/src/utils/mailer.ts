import nodemailer from 'nodemailer';

// Store the transporter globally so we don't recreate the test account every time
let transporter: nodemailer.Transporter | null = null;
let etherealCredentials: { user: string; pass: string } | null = null;

// Initialize the transporter when the module loads
async function initializeMailer() {
    try {
        const testAccount = await nodemailer.createTestAccount();
        etherealCredentials = { user: testAccount.user, pass: testAccount.pass };
        console.log("-----------------------------------------------------");
        console.log("Ethereal test account for email previews created:");
        console.log("User: %s", testAccount.user);
        console.log("Pass: %s", testAccount.pass);
        console.log("Access Mailbox: https://ethereal.email/login");
        console.log("-----------------------------------------------------");


        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    } catch (error) {
         console.error("Failed to create Ethereal test account:", error);
         // Optionally fallback to another transport or disable email
    }
}

// Interface for mail options
interface MailOptions {
    to: string; // Ensure this is always a string
    subject: string;
    text: string;
    html: string;
}

export const sendEmail = async (options: MailOptions) => {
    // Initialize transporter if it hasn't been already
    if (!transporter) {
        await initializeMailer();
        // If initialization failed, don't try to send
        if (!transporter) {
             console.error("Email transporter not initialized. Skipping email send.");
             return; // Exit function if transporter failed to init
        }
    }

    // ✨ FIX: Ensure the 'to' field is correctly passed to sendMail ✨
    // Also add basic validation
    if (!options.to || typeof options.to !== 'string') {
        console.error("Error sending email: Invalid or missing 'to' address.", options);
        return; // Don't attempt to send without a valid recipient
    }

    try {
        const info = await transporter.sendMail({
            from: '"Classwork Automation System" <noreply@kkwagh.edu.in>', // Sender address
            to: options.to,          // Recipient address(es)
            subject: options.subject, // Subject line
            text: options.text,       // Plain text body
            html: options.html,       // HTML body
        });

        console.log("Message sent: %s", info.messageId);
        // Get a preview URL for the sent email from Ethereal
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log("Preview URL: %s", previewUrl);
        } else {
             console.log("Could not get Ethereal preview URL (email likely sent successfully).");
        }
    } catch (error) {
        console.error("Error sending email via Nodemailer:", error);
        // Log the options that failed for debugging
        console.error("Failed email options:", options);
    }
};

// Initialize the mailer when the application starts (optional, but good practice)
// initializeMailer(); // You can call this once when your server starts if preferred

