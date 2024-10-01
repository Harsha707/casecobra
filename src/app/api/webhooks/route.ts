import { db } from "@/db"; // Adjust this import to your DB structure
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";

export async function POST(req: Request) {
  try {
    const webhookBody = await req.text(); // Get raw request body for signature verification
    const webhookSignature = headers().get("x-razorpay-signature");

    if (!webhookSignature) {
      return new Response("Invalid signature", { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    // Validate the webhook signature
    const isValidSignature = validateWebhookSignature(
      webhookBody,
      webhookSignature,
      webhookSecret
    );

    if (!isValidSignature) {
      return new Response("Signature mismatch", { status: 400 });
    }

    // Parse the JSON body after validation
    const event = JSON.parse(webhookBody);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const { userId, orderId } = payment.notes || {
        userId: null,
        orderId: null,
      };

      if (!userId || !orderId) {
        throw new Error("Invalid request metadata");
      }

      // Update the order in the database
      await db.order.update({
        where: { id: orderId },
        data: {
          isPaid: true,
          paymentId: payment.id,
        },
      });
    }

    return NextResponse.json({ result: event, ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Something went wrong", ok: false },
      { status: 500 }
    );
  }
}
