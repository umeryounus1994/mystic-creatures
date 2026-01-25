const Booking = require('../models/booking.model');
const Commission = require('../models/commission.model');
const Review = require('../models/review.model');
const Refund = require('../models/refund.model');
const Dispute = require('../models/dispute.model');

/**
 * Cleanup unpaid bookings older than 5 hours
 * This job removes bookings and all associated data where payment_status is not 'paid'
 * and the booking was created more than 5 hours ago
 */
const cleanupUnpaidBookings = async () => {
    try {
        console.log('🔄 Starting cleanup of unpaid bookings...');
        
        // Calculate the cutoff time (5 hours ago)
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
        
        // Find all unpaid bookings older than 5 hours
        const unpaidBookings = await Booking.find({
            payment_status: { $ne: 'paid' },
            created_at: { $lt: fiveHoursAgo }
        });
        
        if (unpaidBookings.length === 0) {
            console.log('✅ No unpaid bookings to cleanup');
            return {
                success: true,
                deletedCount: 0,
                message: 'No unpaid bookings found to cleanup'
            };
        }
        
        console.log(`📋 Found ${unpaidBookings.length} unpaid booking(s) to cleanup`);
        
        let deletedCount = 0;
        let errorCount = 0;
        
        // Delete associated data for each booking
        for (const booking of unpaidBookings) {
            try {
                const bookingId = booking._id;
                
                // Delete associated commissions
                const commissionResult = await Commission.deleteMany({ booking_id: bookingId });
                if (commissionResult.deletedCount > 0) {
                    console.log(`  🗑️  Deleted ${commissionResult.deletedCount} commission(s) for booking ${booking.booking_id}`);
                }
                
                // Delete associated reviews
                const reviewResult = await Review.deleteMany({ booking_id: bookingId });
                if (reviewResult.deletedCount > 0) {
                    console.log(`  🗑️  Deleted ${reviewResult.deletedCount} review(s) for booking ${booking.booking_id}`);
                }
                
                // Delete associated refunds
                const refundResult = await Refund.deleteMany({ booking_id: bookingId });
                if (refundResult.deletedCount > 0) {
                    console.log(`  🗑️  Deleted ${refundResult.deletedCount} refund(s) for booking ${booking.booking_id}`);
                }
                
                // Delete associated disputes
                const disputeResult = await Dispute.deleteMany({ booking_id: bookingId });
                if (disputeResult.deletedCount > 0) {
                    console.log(`  🗑️  Deleted ${disputeResult.deletedCount} dispute(s) for booking ${booking.booking_id}`);
                }
                
                // Delete the booking itself
                await Booking.findByIdAndDelete(bookingId);
                deletedCount++;
                console.log(`  ✅ Deleted booking ${booking.booking_id}`);
                
            } catch (error) {
                errorCount++;
                console.error(`  ❌ Error deleting booking ${booking.booking_id}:`, error.message);
            }
        }
        
        const result = {
            success: true,
            deletedCount,
            errorCount,
            totalFound: unpaidBookings.length,
            message: `Cleanup completed: ${deletedCount} booking(s) deleted, ${errorCount} error(s)`
        };
        
        console.log(`✅ Cleanup completed: ${deletedCount} booking(s) deleted, ${errorCount} error(s)`);
        return result;
        
    } catch (error) {
        console.error('❌ Error in cleanupUnpaidBookings job:', error);
        return {
            success: false,
            error: error.message,
            message: 'Cleanup job failed'
        };
    }
};

module.exports = cleanupUnpaidBookings;
