import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    orderBy: [{ dueDate: "asc" }],
    include: { channel: true, brand: true },
  });
  return NextResponse.json(invoices);
}
