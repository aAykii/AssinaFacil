import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Contract } from "./contracts";

/**
 * Creates a server-side Supabase client using the anon/publishable key.
 * No user session is required — the RPCs are SECURITY DEFINER and
 * the storage bucket allows anon SELECT.
 */
function getAnonSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY env vars.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Public server function: fetches a contract by its unique token and,
 * if valid, generates a temporary signed URL for the PDF document.
 *
 * Runs entirely on the server so the browser never touches the
 * Supabase client directly on the public signing page.
 */
export const fetchContractForSigning = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const supabase = getAnonSupabase();

    const { data: raw, error } = await supabase.rpc("get_contract_by_token", {
      _token: data.token,
    });

    if (error || !raw) {
      return {
        kind: "invalid" as const,
        reason: "Link inválido ou expirado. Solicite um novo ao remetente.",
      };
    }

    const contract = raw as unknown as Contract;

    if (contract.status === "signed") {
      return { kind: "signed" as const, contract, pdfUrl: null };
    }

    if (new Date(contract.expires_at) < new Date()) {
      return {
        kind: "invalid" as const,
        reason: "Este link expirou. Solicite um novo ao remetente.",
      };
    }

    // Generate a signed URL for the PDF (1 hour)
    let pdfUrl: string | null = null;
    const { data: urlData, error: urlError } = await supabase.storage
      .from("contracts")
      .createSignedUrl(contract.document_path, 60 * 60);

    if (!urlError && urlData) {
      pdfUrl = urlData.signedUrl;
    }

    return { kind: "ready" as const, contract, pdfUrl };
  });

/**
 * Public server function: signs a pending, non-expired contract.
 * Calls the SECURITY DEFINER RPC `sign_contract`.
 */
export const signContractServer = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; name: string }) => input)
  .handler(async ({ data }) => {
    const supabase = getAnonSupabase();

    const { data: result, error } = await supabase.rpc("sign_contract", {
      _token: data.token,
      _name: data.name,
    });

    if (error || !result) {
      return { success: false as const, contract: null };
    }

    return { success: true as const, contract: result as unknown as Contract };
  });
