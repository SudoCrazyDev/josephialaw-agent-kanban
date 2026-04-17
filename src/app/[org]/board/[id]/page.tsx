import { notFound } from "next/navigation";

import { BoardClient } from "@/components/board/board-client";
import { getCurrentUser } from "@/lib/auth/session";
import { getMockBoardSnapshot } from "@/lib/mock-data";

type Props = {
  params: Promise<{ org: string; id: string }>;
};

export default async function BoardPage({ params }: Props) {
  const { org, id } = await params;

  const [user, snapshot] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(getMockBoardSnapshot(org, id))
  ]);

  if (!snapshot) notFound();

  return <BoardClient initial={snapshot} user={user} />;
}
