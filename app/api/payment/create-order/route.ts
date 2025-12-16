import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { courseId, courseIds } = await req.json();

        if (!courseId && (!courseIds || courseIds.length === 0)) {
            return NextResponse.json(
                { error: 'Course ID(s) are required' },
                { status: 400 }
            );
        }

        let totalAmount = 0;
        const targetIds: string[] = courseIds || [courseId];

        // Fetch prices from Firestore (Server-Side Validation)
        const refs = targetIds.map(id => adminDb.collection('subjects_metadata').doc(id));
        const snapshots = await adminDb.getAll(...refs);

        for (const snap of snapshots) {
            if (snap.exists) {
                const data = snap.data();
                // Ensure we have a valid price, default to 0 (or handle error)
                // Assuming price is required for paid courses.
                if (data?.price) {
                    totalAmount += data.price;
                }
            } else {
                return NextResponse.json(
                    { error: `Course not found: ${snap.id}` },
                    { status: 404 }
                );
            }
        }

        if (totalAmount <= 0) {
            return NextResponse.json(
                { error: 'Invalid total amount' },
                { status: 400 }
            );
        }

        const receiptId = courseIds
            ? `receipt_bundle_${Date.now()}`
            : `receipt_${courseId}_${Date.now()}`;

        const options = {
            amount: Math.round(totalAmount * 100), // Razorpay expects amount in paise
            currency: 'INR',
            receipt: receiptId,
            notes: {
                courseIds: targetIds.join(','),
                type: courseIds ? 'bundle' : 'single'
            }
        };

        const order = await razorpay.orders.create(options);

        // Security: Return the calculated amount so frontend knows what was actually charged
        // (Optional but good for UX debugging if they differ)
        return NextResponse.json({ ...order, calculatedAmount: totalAmount });
    } catch (error: any) {
        console.error('Error creating order:', error);
        return NextResponse.json(
            { error: 'Error creating order: ' + error.message },
            { status: 500 }
        );
    }
}
