const Commission = require('../models/commission.model');
const UserModel = require('../models/user.model');
const stripe = require('../../../config/stripe');
const { client } = require('../../../config/paypalPayouts');
const payoutsSdk = require('@paypal/payouts-sdk');
const payoutConfig = require('../../../config/automaticPayouts.config');

/**
 * Automatic Payouts Job
 * Processes pending commissions and automatically sends payouts to partners
 * based on their configured payout method (Stripe or PayPal)
 * 
 * Configuration loaded from: config/automaticPayouts.settings.json
 */
const processAutomaticPayouts = async () => {
    try {
        // Load configuration from file
        const config = payoutConfig.getConfig();
        
        // Check if automatic payouts are enabled
        if (!config.enabled) {
            console.log('⏭️  Automatic payouts are disabled');
            return {
                success: true,
                message: 'Automatic payouts are disabled',
                processed: 0
            };
        }

        console.log('💰 Starting automatic payout processing...');
        console.log(`📋 Configuration: minAmount=${config.minAmount}, minDays=${config.minDays}, batchSize=${config.batchSize}`);
        
        // Calculate minimum date (commissions must be at least X days old)
        const minDate = config.minDays > 0 
            ? new Date(Date.now() - config.minDays * 24 * 60 * 60 * 1000)
            : new Date(0); // No minimum date if 0
        
        // Find eligible commissions
        const query = {
            status: 'confirmed', // Only confirmed commissions
            payout_status: 'unpaid', // Only unpaid
            net_amount: { $gte: config.minAmount }, // Minimum amount
            created_at: { $lte: minDate } // Minimum age (based on when commission was created)
        };
        
        const eligibleCommissions = await Commission.find(query)
            .populate('partner_id')
            .limit(config.batchSize)
            .sort({ created_at: 1 }); // Oldest first
        
        if (eligibleCommissions.length === 0) {
            console.log('✅ No eligible commissions for automatic payout');
            return {
                success: true,
                message: 'No eligible commissions found',
                processed: 0
            };
        }
        
        console.log(`📋 Found ${eligibleCommissions.length} eligible commission(s) for payout`);
        
        // Group commissions by partner and payout method
        const payoutGroups = {};
        
        eligibleCommissions.forEach(commission => {
            const partner = commission.partner_id;
            if (!partner) {
                console.warn(`⚠️  Commission ${commission._id} has no partner, skipping`);
                return;
            }
            
            // Determine payout method
            const preferredMethod = partner.partner_profile?.preferred_payout_method || 'stripe';
            // For Stripe: Only need account_id (payouts_enabled check removed - Stripe API will validate)
            const hasStripe = !!partner.partner_profile?.stripe_connect?.account_id;
            const hasPayPal = partner.partner_profile?.paypal_payout?.paypal_email;
            const hasBankDetails = partner.partner_profile?.bank_details?.account_number && 
                                 partner.partner_profile?.bank_details?.routing_number;
            
            let payoutMethod;
            if (preferredMethod === 'bank_transfer' && hasBankDetails) {
                payoutMethod = 'bank_transfer';
            } else if (preferredMethod === 'stripe' && hasStripe) {
                payoutMethod = 'stripe';
            } else if (preferredMethod === 'paypal' && hasPayPal) {
                payoutMethod = 'paypal';
            } else if (hasStripe) {
                payoutMethod = 'stripe';
            } else if (hasPayPal) {
                payoutMethod = 'paypal';
            } else if (hasBankDetails) {
                payoutMethod = 'bank_transfer';
            } else {
                console.warn(`⚠️  Partner ${partner._id} has no payout method configured, skipping commission ${commission._id}`);
                return;
            }
            
            const key = `${partner._id}_${payoutMethod}`;
            
            if (!payoutGroups[key]) {
                payoutGroups[key] = {
                    partner,
                    payoutMethod,
                    commissions: [],
                    totalAmount: 0
                };
            }
            
            payoutGroups[key].commissions.push(commission);
            payoutGroups[key].totalAmount += commission.net_amount;
        });
        
        console.log(`📊 Grouped into ${Object.keys(payoutGroups).length} payout group(s)`);
        
        const results = {
            stripe: { success: 0, failed: 0, totalAmount: 0 },
            paypal: { success: 0, failed: 0, totalAmount: 0 },
            bank_transfer: { success: 0, failed: 0, totalAmount: 0 },
            noMethod: 0
        };
        
        // Process Stripe payouts
        const stripeGroups = Object.values(payoutGroups).filter(g => g.payoutMethod === 'stripe');
        for (const group of stripeGroups) {
            const { partner, commissions } = group;
            const accountId = partner.partner_profile.stripe_connect.account_id;
            
            // Process each commission individually (Stripe doesn't support batch transfers)
            for (const commission of commissions) {
                try {
                    const transfer = await stripe.transfers.create({
                        amount: Math.round(commission.net_amount * 100), // Convert to cents
                        currency: 'eur',
                        destination: accountId,
                        metadata: {
                            commission_id: commission._id.toString(),
                            booking_id: commission.booking_id.toString(),
                            partner_id: partner._id.toString(),
                            automatic: 'true'
                        }
                    });
                    
                    commission.payout_status = 'paid';
                    commission.payout_method = 'stripe';
                    commission.payout_date = new Date();
                    commission.payout_transaction_id = transfer.id;
                    await commission.save();
                    
                    results.stripe.success++;
                    results.stripe.totalAmount += commission.net_amount;
                    console.log(`  ✅ Stripe payout: $${commission.net_amount.toFixed(2)} to partner ${partner._id} (transfer: ${transfer.id})`);
                    
                } catch (error) {
                    console.error(`  ❌ Stripe payout failed for commission ${commission._id}:`, error.message);
                    commission.payout_status = 'failed';
                    commission.payout_error = error.message;
                    await commission.save();
                    results.stripe.failed++;
                }
            }
        }
        
        // Process Bank Transfer payouts (mark as paid, manual processing)
        const bankTransferGroups = Object.values(payoutGroups).filter(g => g.payoutMethod === 'bank_transfer');
        for (const group of bankTransferGroups) {
            const { partner, commissions } = group;
            
            // Mark all commissions as paid (bank transfer is manual)
            const commissionIds = commissions.map(c => c._id);
            try {
                await Commission.updateMany(
                    { _id: { $in: commissionIds } },
                    {
                        payout_status: 'paid',
                        payout_method: 'bank_transfer',
                        payout_date: new Date(),
                        payout_transaction_id: `bank_transfer_${Date.now()}_${partner._id}`
                    }
                );
                
                const totalAmount = commissions.reduce((sum, c) => sum + c.net_amount, 0);
                results.bank_transfer.success += commissions.length;
                results.bank_transfer.totalAmount += totalAmount;
                console.log(`  ✅ Bank transfer marked: $${totalAmount.toFixed(2)} for partner ${partner._id} (${commissions.length} commission(s) - manual bank transfer required)`);
            } catch (error) {
                console.error(`  ❌ Bank transfer marking failed for partner ${partner._id}:`, error.message);
                await Commission.updateMany(
                    { _id: { $in: commissionIds } },
                    {
                        payout_status: 'failed',
                        payout_error: error.message
                    }
                );
                results.bank_transfer.failed += commissions.length;
            }
        }
        
        // Process PayPal payouts (batch by partner)
        const paypalGroups = Object.values(payoutGroups).filter(g => g.payoutMethod === 'paypal');
        for (const group of paypalGroups) {
            const { partner, commissions, totalAmount } = group;
            const paypalEmail = partner.partner_profile.paypal_payout.paypal_email;
            
            try {
                // Create batch payout for this partner
                const request = new payoutsSdk.payouts.PayoutsPostRequest();
                
                request.requestBody({
                    sender_batch_header: {
                        recipient_type: "EMAIL",
                        email_message: "You have received automatic commission payouts from your bookings",
                        note: `Automatic payout for ${commissions.length} commission(s)`,
                        sender_batch_id: `auto_batch_${Date.now()}_${partner._id}`
                    },
                    items: [{
                        recipient_type: "EMAIL",
                        amount: {
                            value: totalAmount.toFixed(2),
                            currency: "EUR"
                        },
                        receiver: paypalEmail,
                        note: `Automatic payout for ${commissions.length} commission(s)`,
                        sender_item_id: partner._id.toString()
                    }]
                });
                
                const payout = await client().execute(request);
                const batchId = payout.result.batch_header.payout_batch_id;
                
                // Update all commissions for this partner
                const commissionIds = commissions.map(c => c._id);
                await Commission.updateMany(
                    { _id: { $in: commissionIds } },
                    {
                        payout_status: 'paid',
                        payout_method: 'paypal',
                        payout_date: new Date(),
                        payout_transaction_id: batchId,
                        payout_batch_id: batchId
                    }
                );
                
                results.paypal.success += commissions.length;
                results.paypal.totalAmount += totalAmount;
                console.log(`  ✅ PayPal batch payout: $${totalAmount.toFixed(2)} to partner ${partner._id} (${commissions.length} commission(s), batch: ${batchId})`);
                
            } catch (error) {
                console.error(`  ❌ PayPal batch payout failed for partner ${partner._id}:`, error.message);
                
                // Mark all commissions as failed
                const commissionIds = commissions.map(c => c._id);
                await Commission.updateMany(
                    { _id: { $in: commissionIds } },
                    {
                        payout_status: 'failed',
                        payout_error: error.message
                    }
                );
                
                results.paypal.failed += commissions.length;
            }
        }
        
        const summary = {
            success: true,
            message: `Processed ${results.stripe.success + results.paypal.success + results.bank_transfer.success} commission(s)`,
            processed: results.stripe.success + results.paypal.success + results.bank_transfer.success,
            failed: results.stripe.failed + results.paypal.failed + results.bank_transfer.failed,
            stripe: {
                success: results.stripe.success,
                failed: results.stripe.failed,
                totalAmount: results.stripe.totalAmount
            },
            paypal: {
                success: results.paypal.success,
                failed: results.paypal.failed,
                totalAmount: results.paypal.totalAmount
            },
            bank_transfer: {
                success: results.bank_transfer.success,
                failed: results.bank_transfer.failed,
                totalAmount: results.bank_transfer.totalAmount
            },
            totalAmount: results.stripe.totalAmount + results.paypal.totalAmount + results.bank_transfer.totalAmount
        };
        
        console.log(`✅ Automatic payout processing completed:`);
        console.log(`   - Stripe: ${results.stripe.success} success, ${results.stripe.failed} failed, $${results.stripe.totalAmount.toFixed(2)}`);
        console.log(`   - PayPal: ${results.paypal.success} success, ${results.paypal.failed} failed, $${results.paypal.totalAmount.toFixed(2)}`);
        console.log(`   - Bank Transfer: ${results.bank_transfer.success} marked, ${results.bank_transfer.failed} failed, $${results.bank_transfer.totalAmount.toFixed(2)}`);
        console.log(`   - Total: $${summary.totalAmount.toFixed(2)}`);
        
        return summary;
        
    } catch (error) {
        console.error('❌ Error in automatic payouts job:', error);
        return {
            success: false,
            error: error.message,
            message: 'Automatic payout job failed'
        };
    }
};

module.exports = processAutomaticPayouts;
