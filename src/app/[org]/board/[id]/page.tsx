import { notFound } from "next/navigation";

import { BoardClient } from "@/components/board/board-client";
import { getMockBoardSnapshot } from "@/lib/mock-data";

type Props = {
  params: Promise<{ org: string; id: string }>;
};

export default async function BoardPage({ params }: Props) {
  const { org, id } = await params;

  // TODO(phase-2.5): replace with a Supabase fetch once migrations are applied.
  const snapshot = getMockBoardSnapshot(org, id);
  if (!snapshot) notFound();

  return <BoardClient initial={snapshot} />;
}
