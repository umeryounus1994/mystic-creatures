const crypto = require('crypto');

const generators = {
    generateBookingId: () => {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `BK${timestamp.slice(-6)}${random}`;
    },

    generatePayoutId: () => {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `PO${timestamp.slice(-6)}${random}`;
    },

    generateRefundId: () => {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `RF${timestamp.slice(-6)}${random}`;
    },

    generatePurchaseId: () => {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `QP${timestamp.slice(-6)}${random}`;
    }
};

module.exports = generators;