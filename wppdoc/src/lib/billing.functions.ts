import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import Stripe from "stripe";

const PRICE_AMOUNT = 990; // R$9,90
const CURRENCY = "brl";
const PRODUCT_NAME = "AssinaFácil Pro";

function getStripe() {
  const key = process.env.STRIPE_TEST_API_KEY;
  if (!key) throw new Error("STRIPE_TEST_API_KEY não configurada.");
  return new Stripe(key, {
    apiVersion: "2024-12-18.acacia" as any,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

async function ensureCustomer(
  stripe: Stripe,
  supabase: any,
  userId: string,
  email: string,
  existing: string | null,
): Promise<string> {
  if (existing) return existing;
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });
  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  return customer.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { origin: string }) => input)
  .handler(async ({ data, context }) => {
    const stripe = getStripe();
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("id,email,plan,stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) throw new Error("Perfil não encontrado.");
    if (profile.plan === "pro") {
      return { url: `${data.origin}/dashboard` };
    }

    const customerId = await ensureCustomer(
      stripe,
      context.supabase,
      profile.id,
      profile.email,
      profile.stripe_customer_id,
    );

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: { name: PRODUCT_NAME },
            unit_amount: PRICE_AMOUNT,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${data.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/pricing`,
      metadata: { supabase_user_id: profile.id },
    });

    return { url: session.url as string };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { origin: string }) => input)
  .handler(async ({ data, context }) => {
    const stripe = getStripe();
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.stripe_customer_id) {
      throw new Error("Você ainda não tem assinatura ativa.");
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${data.origin}/dashboard`,
    });
    return { url: portal.url as string };
  });

/**
 * Called from /billing/success after Stripe redirect.
 * Retrieves the checkout session and promotes the user to Pro when paid.
 */
export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data, context }) => {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    if (session.metadata?.supabase_user_id !== context.userId) {
      throw new Error("Sessão de checkout não pertence ao usuário.");
    }
    const paid = session.payment_status === "paid" || session.status === "complete";
    if (!paid) return { upgraded: false };

    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    await context.supabase
      .from("profiles")
      .update({ plan: "pro", stripe_customer_id: customerId ?? null })
      .eq("id", context.userId);

    return { upgraded: true };
  });