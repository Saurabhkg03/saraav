import Razorpay from 'razorpay';

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
    console.warn("Razorpay keys are missing. Payment features will not work.");
}

export const razorpay = new Razorpay({
    key_id: keyId || "test_key",
    key_secret: keySecret || "test_secret",
});
