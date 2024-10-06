"use server";

import { BASE_PRICE, PRODUCT_PRICES } from "@/config/products";
import { db } from "@/db";
import { razorpay } from "@/lib/razorpay";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Order } from "@prisma/client";

export const createCheckoutSession = async ({
  configId,
}: {
  configId: string;
}) => {
  const configuration = await db.configuration.findUnique({
    where: { id: configId },
  });

  if (!configuration) {
    throw new Error("No such configuration found");
  }

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    throw new Error("You need to be logged in");
  }

  const { finish, material } = configuration;

  let price = BASE_PRICE;
  if (finish === "textured") price += PRODUCT_PRICES.finish.textured;
  if (material === "polycarbonate")
    price += PRODUCT_PRICES.material.polycarbonate;

  let order: Order | undefined = undefined;

  const existingOrder = await db.order.findFirst({
    where: {
      userId: user.id,
      configurationId: configuration.id,
    },
  });

  console.log(user.id, configuration.id);

  if (existingOrder) {
    order = existingOrder;
  } else {
    order = await db.order.create({
      data: {
        amount: price / 100,
        userId: user.id,
        configurationId: configuration.id,
      },
    });
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: price,
    currency: "INR",
    receipt: `receipt_order_${order.id}`,
    payment_capture: true,
    notes: {
      userId: user.id,
      orderId: order.id,
    },
  });

  return {
    orderId: razorpayOrder.id,
    key_id: process.env.RAZORPAY_KEY_ID,
    dbOrderId: order.id,
  };
};
