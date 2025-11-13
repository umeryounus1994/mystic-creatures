const Commission = require('../models/commission.model');
const Booking = require('../models/booking.model');
const { generateResponse } = require('../utils/response');
const mongoose = require('mongoose');

const partnerEarningsController = {
    // Get partner earnings summary
    getEarningsSummary: async (req, res) => {
        try {
            const partnerId = new mongoose.Types.ObjectId(req.user.id);
            
            // Get total partner earnings (gross - commission)
            const totalEarnings = await Commission.aggregate([
                { 
                    $match: { 
                        partner_id: partnerId, 
                        status: 'confirmed' 
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        partnerEarnings: { $sum: { $subtract: ['$gross_amount', '$commission_amount'] } },
                        totalCommission: { $sum: '$commission_amount' },
                        totalGross: { $sum: '$gross_amount' },
                        count: { $sum: 1 }
                    } 
                }
            ]);

            // Get pending earnings
            const pendingEarnings = await Commission.aggregate([
                { $match: { partner_id: partnerId, status: 'pending' } },
                { 
                    $group: { 
                        _id: null, 
                        partnerEarnings: { $sum: { $subtract: ['$gross_amount', '$commission_amount'] } },
                        totalCommission: { $sum: '$commission_amount' }
                    } 
                }
            ]);

            // Get this month's earnings
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const monthlyEarnings = await Commission.aggregate([
                { 
                    $match: { 
                        partner_id: partnerId, 
                        status: 'confirmed',
                        transaction_date: { $gte: startOfMonth }
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        partnerEarnings: { $sum: { $subtract: ['$gross_amount', '$commission_amount'] } },
                        totalCommission: { $sum: '$commission_amount' }
                    } 
                }
            ]);

            // Get total bookings count
            const totalBookings = await Commission.countDocuments({ 
                partner_id: partnerId, 
                status: 'confirmed' 
            });
            
            const earnings = totalEarnings[0] || { partnerEarnings: 0, totalCommission: 0, totalGross: 0, count: 0 };
            const pending = pendingEarnings[0] || { partnerEarnings: 0, totalCommission: 0 };
            const monthly = monthlyEarnings[0] || { partnerEarnings: 0, totalCommission: 0 };
            
            return generateResponse(res, 200, 'Earnings summary retrieved', {
                totalEarnings: earnings.partnerEarnings,
                pendingEarnings: pending.partnerEarnings,
                monthlyEarnings: monthly.partnerEarnings,
                totalBookings,
                averageEarningsPerBooking: totalBookings > 0 ? earnings.partnerEarnings / totalBookings : 0,
                commissionStats: {
                    totalCommissionPaid: earnings.totalCommission,
                    pendingCommission: pending.totalCommission,
                    monthlyCommission: monthly.totalCommission,
                    totalGrossRevenue: earnings.totalGross,
                    averageCommissionRate: earnings.totalGross > 0 ? (earnings.totalCommission / earnings.totalGross * 100).toFixed(2) : 0
                }
            });
            
        } catch (error) {
            console.error('Error getting earnings summary:', error);
            return generateResponse(res, 500, 'Error retrieving earnings', null, error.message);
        }
    },
    
    // Get detailed earnings history
    getEarningsHistory: async (req, res) => {
        try {
            const partnerId = new mongoose.Types.ObjectId(req.user.id);
            const { page = 1, limit = 20, status, startDate, endDate } = req.query;
            
            const query = { partner_id: partnerId };
            
            if (status) query.status = status;
            if (startDate || endDate) {
                query.transaction_date = {};
                if (startDate) query.transaction_date.$gte = new Date(startDate);
                if (endDate) query.transaction_date.$lte = new Date(endDate);
            }
            
            const earnings = await Commission.find(query)
                .populate('booking_id', 'booking_id activity_id participants total_amount user_id')
                .populate({
                    path: 'booking_id',
                    populate: [
                        { path: 'activity_id', select: 'title' },
                        { path: 'user_id', select: 'username email' }
                    ]
                })
                .sort({ transaction_date: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);
            
            const total = await Commission.countDocuments(query);
            
            return generateResponse(res, 200, 'Earnings history retrieved', {
                earnings,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total
                }
            });
            
        } catch (error) {
            console.error('Error getting earnings history:', error);
            return generateResponse(res, 500, 'Error retrieving earnings history', null, error.message);
        }
    },
    
    // Get earnings analytics
    getEarningsAnalytics: async (req, res) => {
        try {
            const partnerId = new mongoose.Types.ObjectId(req.user.id);
            const { period = '6months' } = req.query;
            
            let startDate;
            switch (period) {
                case '1month':
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '3months':
                    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case '6months':
                    startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
                    break;
                case '1year':
                    startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
            }
            
            // Monthly earnings breakdown
            const monthlyEarnings = await Commission.aggregate([
                {
                    $match: {
                        partner_id: partnerId,
                        status: 'confirmed',
                        transaction_date: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$transaction_date' },
                            month: { $month: '$transaction_date' }
                        },
                        earnings: { $sum: { $subtract: ['$gross_amount', '$commission_amount'] } },
                        bookings: { $sum: 1 },
                        avgCommissionRate: { $avg: '$commission_rate' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);
            
            // Top performing activities
            const topActivities = await Commission.aggregate([
                {
                    $match: {
                        partner_id: partnerId,
                        status: 'confirmed',
                        transaction_date: { $gte: startDate }
                    }
                },
                {
                    $lookup: {
                        from: 'bookings',
                        localField: 'booking_id',
                        foreignField: '_id',
                        as: 'booking'
                    }
                },
                { $unwind: '$booking' },
                {
                    $lookup: {
                        from: 'activities',
                        localField: 'booking.activity_id',
                        foreignField: '_id',
                        as: 'activity'
                    }
                },
                { $unwind: '$activity' },
                {
                    $group: {
                        _id: '$activity._id',
                        title: { $first: '$activity.title' },
                        earnings: { $sum: { $subtract: ['$gross_amount', '$commission_amount'] } },
                        bookings: { $sum: 1 },
                        avgBookingValue: { $avg: '$gross_amount' }
                    }
                },
                { $sort: { earnings: -1 } },
                { $limit: 5 }
            ]);
            
            // Commission status breakdown
            const commissionStatusBreakdown = await Commission.aggregate([
                {
                    $match: {
                        partner_id: partnerId,
                        transaction_date: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: { $subtract: ['$gross_amount', '$commission_amount'] } }
                    }
                }
            ]);
            
            // Transaction type breakdown
            const transactionTypeBreakdown = await Commission.aggregate([
                {
                    $match: {
                        partner_id: partnerId,
                        transaction_date: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$transaction_type',
                        count: { $sum: 1 },
                        totalAmount: { $sum: { $subtract: ['$gross_amount', '$commission_amount'] } }
                    }
                }
            ]);
            
            return generateResponse(res, 200, 'Earnings analytics retrieved', {
                monthlyEarnings,
                topActivities,
                commissionStatusBreakdown,
                transactionTypeBreakdown,
                period
            });
            
        } catch (error) {
            console.error('Error getting earnings analytics:', error);
            return generateResponse(res, 500, 'Error retrieving analytics', null, error.message);
        }
    }
};

module.exports = partnerEarningsController;
