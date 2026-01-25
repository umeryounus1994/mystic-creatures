const sgMail = require('@sendgrid/mail');
const { sendIonosEmail } = require('../helpers/ionosEmail');

const sgMailApiKey = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(sgMailApiKey);

// Generic email sender with fallback support
const sendEmail = async (emailData) => {
    try {
        const { to, subject, template, data, useIonos = false } = emailData;
        
        
        // Generate HTML content based on template
        let htmlContent = '';
        
        if (template === 'booking-confirmation') {
            htmlContent = generateBookingConfirmationHTML(data);
        } else if (template === 'booking-cancellation') {
            htmlContent = generateBookingCancellationHTML(data);
        } else if (template === 'partner-booking-notification') {
            htmlContent = generatePartnerNotificationHTML(data);
        } else if (template === 'password-reset') {
            htmlContent = generatePasswordResetHTML(data);
        }
        
        // Try IONOS first if specified, otherwise use SendGrid
        if (useIonos) {
            const ionosResult = await sendIonosEmail(to, subject, htmlContent);
            if (ionosResult.success) {
                console.log(`✅ Email sent successfully via IONOS to ${to}`);
                return true;
            } else {
                console.log('⚠️ IONOS failed, falling back to SendGrid');
            }
        }
        
        // SendGrid as primary or fallback
        const msg = {
            to,
            from: { name: 'MyCre App', email: 'info@mycrebooking.com' },
            subject,
            html: htmlContent
        };
        
        await sgMail.send(msg);
        console.log(`✅ Email sent successfully via SendGrid to ${to}`);
        return true;
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        if (error.response) {
            console.error('SendGrid error details:', error.response.body);
        }
        return false;
    }
};

const generateBookingConfirmationHTML = (data) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Buchung bestätigt</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">🎉 Buchung bestätigt!</h2>
            
            <p>Hallo ${data.customerName},</p>
            
            <p>Großartige Neuigkeiten! Ihre Buchung wurde bestätigt und die Zahlung erfolgreich bearbeitet.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Buchungsdetails</h3>
                <p><strong>Buchungs-ID:</strong> ${data.bookingId}</p>
                <p><strong>Aktivität:</strong> ${data.activityTitle}</p>
                <p><strong>Datum:</strong> ${data.date}</p>
                <p><strong>Uhrzeit:</strong> ${data.formattedStartTime} - ${data.formattedEndTime}</p>
                <p><strong>Standort:</strong> <a href="${data.googleMapLink}" target="_blank" style="color: #e91e63; text-decoration: none;">📍 Auf Google Maps anzeigen</a></p>
                <p><strong>Teilnehmer:</strong> ${data.participants}</p>
                <p><strong>Gesamtbetrag:</strong> €${data.totalAmount}</p>
                ${data.specialRequests ? `<p><strong>Besondere Wünsche:</strong> ${data.specialRequests}</p>` : ''}
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>Partner-Kontakt</h4>
                <p><strong>${data.partnerName}</strong></p>
                ${data.partnerContact ? `<p>Kontakt: ${data.partnerContact}</p>` : ''}
            </div>
            
            <p>Bitte kommen Sie 15 Minuten vor Ihrer geplanten Zeit an. Wenn Sie Änderungen vornehmen müssen, kontaktieren Sie uns bitte sofort.</p>
            
            <p>Vielen Dank, dass Sie MyCre App gewählt haben!</p>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
                Dies ist eine automatische Bestätigungs-E-Mail. Bitte antworten Sie nicht auf diese E-Mail.
            </p>
        </div>
    </body>
    </html>`;
};

const generatePartnerNotificationHTML = (data) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Neue Buchung erhalten</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2196F3;">📅 Neue Buchung erhalten!</h2>
            
            <p>Hallo ${data.partnerName},</p>
            
            <p>Sie haben eine neue Buchung für Ihre Aktivität erhalten!</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Buchungsdetails</h3>
                <p><strong>Buchungs-ID:</strong> ${data.bookingId}</p>
                <p><strong>Aktivität:</strong> ${data.activityTitle}</p>
                <p><strong>Kunde:</strong> ${data.customerName}</p>
                <p><strong>Kunden-E-Mail:</strong> ${data.customerEmail}</p>
                <p><strong>Datum:</strong> ${data.date}</p>
                <p><strong>Uhrzeit:</strong> ${data.formattedStartTime} - ${data.formattedEndTime}</p>
                <p><strong>Standort:</strong> <a href="${data.googleMapLink}" target="_blank" style="color: #e91e63; text-decoration: none;">📍 Auf Google Maps anzeigen</a></p>
                <p><strong>Teilnehmer:</strong> ${data.participants}</p>
                <p><strong>Gesamtbetrag:</strong> €${data.totalAmount}</p>
                <p><strong>Ihr Verdienst:</strong> €${data.partnerEarnings}</p>
                ${data.specialRequests ? `<p><strong>Besondere Wünsche:</strong> ${data.specialRequests}</p>` : ''}
            </div>
            
            <p>Bitte bereiten Sie sich auf diese Buchung vor und kontaktieren Sie den Kunden bei Bedarf.</p>
            
            <p>Mit freundlichen Grüßen,<br>MyCre App Team</p>
        </div>
    </body>
    </html>`;
};

const generateBookingCancellationHTML = (data) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Buchung storniert</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f44336;">❌ Buchung storniert</h2>
            
            <p>Hallo ${data.customerName},</p>
            
            <p>Ihre Buchung wurde storniert.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Stornierte Buchungsdetails</h3>
                <p><strong>Buchungs-ID:</strong> ${data.bookingId}</p>
                <p><strong>Aktivität:</strong> ${data.activityTitle}</p>
                <p><strong>Datum:</strong> ${data.date}</p>
                <p><strong>Uhrzeit:</strong> ${data.formattedStartTime} - ${data.formattedEndTime}</p>
                <p><strong>Standort:</strong> <a href="${data.googleMapLink}" target="_blank" style="color: #e91e63; text-decoration: none;">📍 Auf Google Maps anzeigen</a></p>
                ${data.cancellationReason ? `<p><strong>Grund:</strong> ${data.cancellationReason}</p>` : ''}
                ${data.refundAmount > 0 ? `<p><strong>Rückerstattungsbetrag:</strong> €${data.refundAmount}</p>` : ''}
            </div>
            
            <p>Wenn Sie Fragen haben, kontaktieren Sie bitte unser Support-Team.</p>
            
            <p>Vielen Dank,<br>MyCre App Team</p>
        </div>
    </body>
    </html>`;
};

const generatePasswordResetHTML = (data) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Passwort zurücksetzen</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2196F3;">🔐 Passwort zurücksetzen</h2>
            
            <p>Hallo ${data.userName},</p>
            
            <p>Folgen Sie dem untenstehenden Link, um ein neues Passwort für Ihr Konto einzugeben:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetLink}" target="_blank" 
                   style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Passwort zurücksetzen
                </a>
            </div>
            
            <p>Oder kopieren Sie diesen Link und fügen Sie ihn in Ihren Browser ein:</p>
            <p style="word-break: break-all; color: #666;">${data.resetLink}</p>
            
            <p>Mit freundlichen Grüßen,<br>Team MyCre Booking</p>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
                Wenn Sie diese Passwort-Zurücksetzung nicht angefordert haben, ignorieren Sie bitte diese E-Mail.
            </p>
        </div>
    </body>
    </html>`;
};

module.exports = { sendEmail };
