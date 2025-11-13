const nodemailer = require('nodemailer');

// Create IONOS SMTP transporter
const ionosTransporter = nodemailer.createTransport({
  host: 'smtp.ionos.de',
  port: 587,
  secure: false, // true for 465, false for other ports like 587
  auth: {
    user: process.env.IONOS_USER,
    pass: process.env.IONOS_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

// Verify connection configuration
ionosTransporter.verify(function(error, success) {
  if (error) {
  } else {
  }
});

// Send email using IONOS SMTP
const sendIonosEmail = async (to, subject, htmlContent, textContent = '') => {
  try {
    
    const mailOptions = {
      from: {
        name: 'MyCre App',
        address: 'info@mycrebooking.com'
      },
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    const result = await ionosTransporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ IONOS email sending failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendIonosEmail,
  ionosTransporter
};
