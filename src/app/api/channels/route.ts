import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const channels = await prisma.channel.findMany({
    orderBy: { type: "asc" },
    include: { _count: { select: { channelStock: true } } },
  });
  return NextResponse.json(channels);
}
