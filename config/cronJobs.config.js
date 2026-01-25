const { CronJob } = require('cron');
const cleanupUnpaidBookings = require('../src/v1/jobs/cleanupUnpaidBookings.job');

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
    console.log('🕐 Initializing cron jobs...');
    
    // Cleanup unpaid bookings every 2 hours
    // Cron expression: '0 */2 * * *' means "at minute 0 of every 2nd hour"
    const cleanupJob = new CronJob(
        '0 */2 * * *', // Run every 2 hours
        async () => {
            console.log(`\n⏰ [${new Date().toISOString()}] Running cleanup unpaid bookings job...`);
            await cleanupUnpaidBookings();
        },
        null, // onComplete callback (not needed)
        true, // start immediately
        'Europe/Berlin' // Germany timezone
    );
    
    console.log('✅ Cron jobs initialized:');
    console.log('   - Cleanup unpaid bookings: Every 2 hours');
    
    return {
        cleanupJob
    };
};

module.exports = {
    initializeCronJobs
};
