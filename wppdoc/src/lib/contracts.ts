import { supabase } from "@/integrations/supabase/client";

export type Contract = {
  id: string;
  token: string;
  document_name: string;
  document_path: string;
  sender_email: string;
  signer_name: string;
  signer_phone: string;
  signer_email: string;
  message: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  signed_at: string | null;
  signed_name: string | null;
};

export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

export async function getSignedPdfUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(path, 60 * 60); // 1h
  if (error) {
    console.error("Erro ao gerar URL assinada:", error);
    return null;
  }
  return data.signedUrl;
}

export function buildSignUrl(token: string): string {
  if (typeof window === "undefined") return `/assinar/${token}`;
  return `${window.location.origin}/assinar/${token}`;
}

export function buildShareMessage(token: string, signerName: string, custom?: string | null): string {
  const link = buildSignUrl(token);
  const intro = `Olá, ${signerName}!`;
  const body = custom?.trim()
    ? custom.trim()
    : "Segue o link para você assinar o contrato digitalmente. O link expira em 48 horas.";
  return `${intro}\n\n${body}\n\n${link}`;
}