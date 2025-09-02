import { getTypedSession } from "@/lib/auth-helpers";
import { fetchPersona, fetchRecentMemories } from "@/lib/services/rag";
import { RagClient } from "./RagClient";
import { getTranslations } from "next-intl/server";

export default async function RagPage() {
  const session = await getTypedSession();
  const userId = session?.user?.id || "anon";
  const [persona, recent] = await Promise.all([
    fetchPersona(userId),
    fetchRecentMemories(userId),
  ]);

  const t = await getTranslations("rag");

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-sm text-gray-600">Index local PDFs from <code>/pdf</code> and semantically search them via Pinecone.</p>
      <RagClient initialPersona={persona} initialRecent={recent} />
    </div>
  );
}
