import { db } from "@/db"; // Adjust this import to your DB structure
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";

export async function POST(req: Request) {
  try {
    // Get raw request body for signature verification
    const webhookBody = await req.text();

    // Get headers from the request
    const headerList = headers();
    const webhookSignature = headerList.get("x-razorpay-signature");

    // Check if Razorpay signature is provided
    if (!webhookSignature) {
      return new Response("Invalid signature", { status: 400 });
    }

    // Ensure Razorpay webhook secret is present
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is not defined");
    }

    // Validate the webhook signature
    const isValidSignature = validateWebhookSignature(
      webhookBody,
      webhookSignature,
      webhookSecret
    );

    // If the signature does not match, return an error response
    if (!isValidSignature) {
      return new Response("Signature mismatch", { status: 400 });
    }

    // Parse the JSON body after signature validation
    const event = JSON.parse(webhookBody);

    // Handle specific events (e.g., payment captured)
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      // Extract metadata from the payment notes
      const { userId, orderId } = payment.notes || {
        userId: null,
        orderId: null,
      };

      // Check if required metadata is available
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

    // Respond with a success status
    return NextResponse.json({ result: event, ok: true });
  } catch (err) {
    // Log the error and return a 500 response
    console.error(err);
    return NextResponse.json(
      { message: "Something went wrong", ok: false },
      { status: 500 }
    );
  }
}
