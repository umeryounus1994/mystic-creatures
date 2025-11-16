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
        <title>Booking Confirmed</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">🎉 Booking Confirmed!</h2>
            
            <p>Hi ${data.customerName},</p>
            
            <p>Great news! Your booking has been confirmed and payment processed successfully.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Booking Details</h3>
                <p><strong>Booking ID:</strong> ${data.bookingId}</p>
                <p><strong>Activity:</strong> ${data.activityTitle}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Time:</strong> ${data.formattedStartTime} - ${data.formattedEndTime}</p>
                <p><strong>Location:</strong> <a href="${data.googleMapLink}" target="_blank" style="color: #e91e63; text-decoration: none;">📍 View on Google Maps</a></p>
                <p><strong>Participants:</strong> ${data.participants}</p>
                <p><strong>Total Paid:</strong> $${data.totalAmount}</p>
                ${data.specialRequests ? `<p><strong>Special Requests:</strong> ${data.specialRequests}</p>` : ''}
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>Partner Contact</h4>
                <p><strong>${data.partnerName}</strong></p>
                ${data.partnerContact ? `<p>Contact: ${data.partnerContact}</p>` : ''}
            </div>
            
            <p>Please arrive 15 minutes before your scheduled time. If you need to make any changes, contact us immediately.</p>
            
            <p>Thank you for choosing MyCre App!</p>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
                This is an automated confirmation email. Please do not reply to this email.
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
        <title>New Booking Received</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2196F3;">📅 New Booking Received!</h2>
            
            <p>Hi ${data.partnerName},</p>
            
            <p>You have received a new booking for your activity!</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Booking Details</h3>
                <p><strong>Booking ID:</strong> ${data.bookingId}</p>
                <p><strong>Activity:</strong> ${data.activityTitle}</p>
                <p><strong>Customer:</strong> ${data.customerName}</p>
                <p><strong>Customer Email:</strong> ${data.customerEmail}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Time:</strong> ${data.formattedStartTime} - ${data.formattedEndTime}</p>
                <p><strong>Location:</strong> <a href="${data.googleMapLink}" target="_blank" style="color: #e91e63; text-decoration: none;">📍 View on Google Maps</a></p>
                <p><strong>Participants:</strong> ${data.participants}</p>
                <p><strong>Total Amount:</strong> $${data.totalAmount}</p>
                <p><strong>Your Earnings:</strong> $${data.partnerEarnings}</p>
                ${data.specialRequests ? `<p><strong>Special Requests:</strong> ${data.specialRequests}</p>` : ''}
            </div>
            
            <p>Please prepare for this booking and contact the customer if needed.</p>
            
            <p>Best regards,<br>MyCre App Team</p>
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
        <title>Booking Cancelled</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f44336;">❌ Booking Cancelled</h2>
            
            <p>Hi ${data.customerName},</p>
            
            <p>Your booking has been cancelled.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Cancelled Booking Details</h3>
                <p><strong>Booking ID:</strong> ${data.bookingId}</p>
                <p><strong>Activity:</strong> ${data.activityTitle}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Time:</strong> ${data.formattedStartTime} - ${data.formattedEndTime}</p>
                <p><strong>Location:</strong> <a href="${data.googleMapLink}" target="_blank" style="color: #e91e63; text-decoration: none;">📍 View on Google Maps</a></p>
                ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
                ${data.refundAmount > 0 ? `<p><strong>Refund Amount:</strong> $${data.refundAmount}</p>` : ''}
            </div>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Thank you,<br>MyCre App Team</p>
        </div>
    </body>
    </html>`;
};

const generatePasswordResetHTML = (data) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2196F3;">🔐 Reset Your Password</h2>
            
            <p>Hey ${data.userName},</p>
            
            <p>Follow the link below to enter a new password for your account:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetLink}" target="_blank" 
                   style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.resetLink}</p>
            
            <p>With best regards,<br>Team MyCre Booking</p>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
                If you didn't request this password reset, please ignore this email.
            </p>
        </div>
    </body>
    </html>`;
};

module.exports = { sendEmail };
