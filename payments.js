// Payment system for Assignment Tracker
class PaymentManager {
    constructor() {
        this.subscriptionTiers = {
            free: {
                name: 'Free',
                price: 0,
                features: [
                    'Up to 10 assignments',
                    'Basic Canvas & Google Classroom sync',
                    '2 courses maximum',
                    'Basic themes'
                ],
                limits: {
                    maxAssignments: 10,
                    maxCourses: 2,
                    syncFrequency: 'daily',
                    themes: ['default', 'dark']
                }
            },
            premium: {
                name: 'Premium',
                price: 4.99,
                priceId: 'price_premium_monthly', // Stripe price ID
                features: [
                    'Unlimited assignments',
                    'Real-time sync',
                    'Unlimited courses',
                    'Custom themes & backgrounds',
                    'Advanced notifications',
                    'Calendar export'
                ],
                limits: {
                    maxAssignments: -1, // unlimited
                    maxCourses: -1,
                    syncFrequency: 'realtime',
                    themes: 'all'
                }
            },
            pro: {
                name: 'Pro',
                price: 9.99,
                priceId: 'price_pro_monthly',
                features: [
                    'Everything in Premium',
                    'Team collaboration',
                    'Advanced analytics',
                    'Priority support',
                    'Cloud backup',
                    'Multi-device sync',
                    'Custom integrations'
                ],
                limits: {
                    maxAssignments: -1,
                    maxCourses: -1,
                    syncFrequency: 'realtime',
                    themes: 'all',
                    teamMembers: 10,
                    analytics: true,
                    cloudBackup: true
                }
            }
        };
        
        this.currentTier = 'premium'; // Demo premium version
        this.loadSubscription();
    }

    loadSubscription() {
        const saved = localStorage.getItem('userSubscription');
        if (saved) {
            const subscription = JSON.parse(saved);
            this.currentTier = subscription.tier;
            this.subscriptionData = subscription;
        }
    }

    saveSubscription(tier, subscriptionId = null) {
        const subscription = {
            tier,
            subscriptionId,
            startDate: new Date().toISOString(),
            status: 'active'
        };
        localStorage.setItem('userSubscription', JSON.stringify(subscription));
        this.currentTier = tier;
        this.subscriptionData = subscription;
    }

    getCurrentTier() {
        return this.subscriptionTiers[this.currentTier];
    }

    canCreateAssignment() {
        const tier = this.getCurrentTier();
        if (tier.limits.maxAssignments === -1) return true;
        
        const assignments = JSON.parse(localStorage.getItem('assignments') || '[]');
        return assignments.length < tier.limits.maxAssignments;
    }

    canAddCourse() {
        const tier = this.getCurrentTier();
        if (tier.limits.maxCourses === -1) return true;
        
        const courses = JSON.parse(localStorage.getItem('userCourses') || '[]');
        return courses.length < tier.limits.maxCourses;
    }

    hasFeature(feature) {
        const tier = this.getCurrentTier();
        switch (feature) {
            case 'realtime_sync':
                return tier.limits.syncFrequency === 'realtime';
            case 'custom_themes':
                return tier.limits.themes === 'all';
            case 'analytics':
                return tier.limits.analytics === true;
            case 'cloud_backup':
                return tier.limits.cloudBackup === true;
            case 'team_collaboration':
                return tier.limits.teamMembers > 0;
            default:
                return false;
        }
    }

    getUpgradeMessage(feature) {
        const messages = {
            assignment_limit: `You've reached the limit of ${this.getCurrentTier().limits.maxAssignments} assignments. Upgrade to Premium for unlimited assignments!`,
            course_limit: `You've reached the limit of ${this.getCurrentTier().limits.maxCourses} courses. Upgrade to Premium for unlimited courses!`,
            realtime_sync: 'Upgrade to Premium for real-time sync with Canvas and Google Classroom!',
            custom_themes: 'Upgrade to Premium to unlock custom themes and backgrounds!',
            analytics: 'Upgrade to Pro for advanced analytics and progress tracking!',
            cloud_backup: 'Upgrade to Pro for cloud backup and multi-device sync!'
        };
        return messages[feature] || 'Upgrade for more features!';
    }

    async createCheckoutSession(tier) {
        try {
            const response = await fetch('/api/payments/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    priceId: this.subscriptionTiers[tier].priceId,
                    tier: tier
                })
            });

            const session = await response.json();
            if (session.url) {
                window.location.href = session.url;
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
        }
    }

    async cancelSubscription() {
        try {
            const response = await fetch('/api/payments/cancel-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                this.saveSubscription('free');
                alert('Subscription cancelled successfully.');
                location.reload();
            }
        } catch (error) {
            console.error('Cancellation error:', error);
            alert('Failed to cancel subscription. Please try again.');
        }
    }
}

// Global payment manager instance
window.paymentManager = new PaymentManager();
