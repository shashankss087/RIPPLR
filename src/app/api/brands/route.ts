import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { onboardedAt: "desc" },
    include: { _count: { select: { skus: true } } },
  });
  return NextResponse.json(brands);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, type, category, contactName, contactEmail } = body;
  if (!name || !type || !category) {
    return NextResponse.json({ error: "name, type and category are required" }, { status: 400 });
  }
  try {
    const brand = await prisma.brand.create({
      data: {
        name,
        type,
        category,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        status: "ONBOARDING",
      },
    });
    return NextResponse.json(brand, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Brand already exists or invalid data" }, { status: 400 });
  }
}
