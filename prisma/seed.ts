import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

// Mirror src/lib/auth.ts hashing without importing it (auth.ts pulls in
// next/headers, which isn't available in a plain seed script).
const hashPw = (pw: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
};

// Deterministic pseudo-random so seeded demand looks realistic but stable.
function rand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const rng = rand(42);
const between = (min: number, max: number) => Math.round(min + rng() * (max - min));

async function main() {
  console.log("Resetting data...");
  await prisma.user.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.shipmentMilestone.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.tradeLane.deleteMany();
  await prisma.return.deleteMany();
  await prisma.salesHistory.deleteMany();
  await prisma.replenishmentOrder.deleteMany();
  await prisma.channelStock.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.mfc.deleteMany();

  // ---- MFCs (cities straight from the DaaS / Green Channel decks) ----
  const mfcSeed = [
    { name: "Bangalore MFC", city: "Bangalore", region: "SOUTH", zones: "AMBIENT,CHILLED,FROZEN", capacityCbm: 8000 },
    { name: "Hyderabad MFC", city: "Hyderabad", region: "SOUTH", zones: "AMBIENT,CHILLED", capacityCbm: 6000 },
    { name: "Chennai MFC", city: "Chennai", region: "SOUTH", zones: "AMBIENT", capacityCbm: 4000 },
    { name: "Mumbai MFC", city: "Mumbai", region: "WEST", zones: "AMBIENT,CHILLED,FROZEN", capacityCbm: 7000 },
    { name: "Pune MFC", city: "Pune", region: "WEST", zones: "AMBIENT,CHILLED", capacityCbm: 5000 },
    { name: "Delhi NCR MFC", city: "Delhi NCR", region: "NORTH", zones: "AMBIENT,CHILLED", capacityCbm: 6500 },
    { name: "Ahmedabad MFC", city: "Ahmedabad", region: "WEST", zones: "AMBIENT", capacityCbm: 3500 },
  ];
  const mfcs = [];
  for (const m of mfcSeed) mfcs.push(await prisma.mfc.create({ data: m }));
  const mfcByCity = Object.fromEntries(mfcs.map((m) => [m.city, m]));

  // ---- Channels: q-commerce, modern trade, general trade, e-com ----
  const channelSeed = [
    { name: "Blinkit", type: "Q_COMMERCE", greenChannel: true },
    { name: "Zepto", type: "Q_COMMERCE", greenChannel: true },
    { name: "Swiggy Instamart", type: "Q_COMMERCE", greenChannel: true },
    { name: "BigBasket Now", type: "Q_COMMERCE", greenChannel: true },
    { name: "Amazon", type: "ECOM", greenChannel: false },
    { name: "Flipkart", type: "ECOM", greenChannel: false },
    { name: "DMart (MT)", type: "MODERN_TRADE", greenChannel: false },
    { name: "Reliance Smart (MT)", type: "MODERN_TRADE", greenChannel: false },
    { name: "GT - Bangalore", type: "GENERAL_TRADE", city: "Bangalore", greenChannel: false },
    { name: "GT - Hyderabad", type: "GENERAL_TRADE", city: "Hyderabad", greenChannel: false },
  ];
  const channels = [];
  for (const c of channelSeed) channels.push(await prisma.channel.create({ data: c }));
  const qcommChannels = channels.filter((c) => c.type === "Q_COMMERCE");

  // ---- Brands + SKUs (Happilo + personal-care brands from the decks) ----
  const brandSeed: {
    name: string; type: string; category: string; status?: string;
    skus: { name: string; category: string; mrp: number; tempZone?: string; green?: boolean }[];
  }[] = [
    {
      name: "Happilo", type: "D2C", category: "Dry Fruits & Nuts",
      skus: [
        { name: "Premium Almonds 200g", category: "Dry Fruits", mrp: 399, green: true },
        { name: "California Walnuts 200g", category: "Dry Fruits", mrp: 549, green: true },
        { name: "Roasted Cashews 200g", category: "Dry Fruits", mrp: 349, green: true },
        { name: "Mixed Dry Fruits 200g", category: "Dry Fruits", mrp: 499, green: true },
      ],
    },
    {
      name: "Fogg", type: "NATIONAL", category: "Deodorants",
      skus: [
        { name: "Fogg Fresh Spray 150ml", category: "Deodorants", mrp: 250 },
        { name: "Fogg Marco Spray 150ml", category: "Deodorants", mrp: 275 },
      ],
    },
    {
      name: "Wild Stone", type: "NATIONAL", category: "Deodorants",
      skus: [
        { name: "Wild Stone Ultra Sensual 150ml", category: "Deodorants", mrp: 230 },
        { name: "Wild Stone Code Platinum 120ml", category: "Deodorants", mrp: 199 },
      ],
    },
    {
      name: "NIVEA", type: "NATIONAL", category: "Personal Care",
      skus: [
        { name: "NIVEA Roll-on Fresh 50ml", category: "Roll-ons", mrp: 199, green: true },
        { name: "NIVEA Shower Gel 250ml", category: "Shower Gel", mrp: 299 },
      ],
    },
    {
      name: "Set Wet", type: "REGIONAL", category: "Hair Care",
      skus: [
        { name: "Set Wet Styling Spray 150ml", category: "Hair Styling", mrp: 220, green: true },
        { name: "Set Wet Wet Look Gel 100ml", category: "Hair Styling", mrp: 130 },
      ],
    },
  ];

  let skuCounter = 1000;
  for (const b of brandSeed) {
    const brand = await prisma.brand.create({
      data: {
        name: b.name, type: b.type, category: b.category, status: b.status ?? "ACTIVE",
        contactName: "Brand Ops", contactEmail: `ops@${b.name.toLowerCase().replace(/\s+/g, "")}.com`,
      },
    });

    for (const s of b.skus) {
      skuCounter += 1;
      const sku = await prisma.sku.create({
        data: {
          code: `RPL-${skuCounter}`,
          name: s.name,
          brandId: brand.id,
          category: s.category,
          mrp: s.mrp,
          cbmPerUnit: 0.0008 + rng() * 0.0015,
          tempZone: s.tempZone ?? "AMBIENT",
          greenChannel: s.green ?? false,
        },
      });

      // MFC inventory: stock this SKU in 3-5 MFCs
      const stockingMfcs = mfcs.slice(0, between(3, mfcs.length));
      for (const m of stockingMfcs) {
        const onHand = between(120, 1400);
        await prisma.inventory.create({
          data: {
            skuId: sku.id, mfcId: m.id,
            onHand,
            allocated: between(0, Math.floor(onHand * 0.15)),
            inTransit: between(0, 400),
            safetyStock: between(80, 250),
          },
        });
      }

      // Channel stock + demand. Q-comm for green-channel SKUs, plus MT/Ecom for all.
      const targets = sku.greenChannel
        ? [...qcommChannels, channels.find((c) => c.name === "Amazon")!]
        : channels.filter((c) => ["MODERN_TRADE", "ECOM"].includes(c.type)).slice(0, 2);

      for (const ch of targets) {
        const velocity = between(8, 120);
        const targetCoverDays = ch.type === "Q_COMMERCE" ? between(3, 6) : between(7, 14);
        const leadTimeHours = ch.type === "Q_COMMERCE" ? 12 : 48;
        // Deliberately leave some at OOS-risk so the engine has work to do.
        const coverNow = rng() < 0.4 ? rng() * targetCoverDays * 0.6 : targetCoverDays * (0.6 + rng());
        await prisma.channelStock.create({
          data: {
            skuId: sku.id,
            channelId: ch.id,
            mfcId: stockingMfcs[0].id,
            onShelf: Math.max(0, Math.round(velocity * coverNow)),
            dailyVelocity: velocity,
            forecastVelocity: velocity,
            leadTimeHours,
            targetCoverDays,
            fillRate: 0.9 + rng() * 0.1,
          },
        });

        // ~42 days of daily offtake with weekend lift, a gentle trend and noise,
        // so the forecast engine has a real signal to learn from.
        const HISTORY_DAYS = 42;
        const isQcomm = ch.type === "Q_COMMERCE";
        const trendPerDay = (rng() - 0.35) * velocity * 0.012; // slight growth bias
        const history: { skuId: string; channelId: string; date: Date; units: number }[] = [];
        for (let d = HISTORY_DAYS; d >= 1; d--) {
          const date = new Date();
          date.setUTCHours(0, 0, 0, 0);
          date.setUTCDate(date.getUTCDate() - d);
          const dow = date.getUTCDay();
          const weekend = dow === 0 || dow === 6;
          const dowLift = weekend ? (isQcomm ? 1.35 : 1.1) : 0.95;
          const base = velocity + trendPerDay * (HISTORY_DAYS - d);
          const noise = 1 + (rng() - 0.5) * 0.3;
          const units = Math.max(0, Math.round(base * dowLift * noise));
          history.push({ skuId: sku.id, channelId: ch.id, date, units });
        }
        await prisma.salesHistory.createMany({ data: history });
      }
    }
  }

  // ---- Reverse logistics: seed a mix of open and processed returns ----
  const RECOVERY: Record<string, number> = { RESELL: 0.95, REFURBISH: 0.6, RECYCLE: 0.05, DISPOSE: 0 };
  const reasons = ["DAMAGED", "NEAR_EXPIRY", "WRONG_ITEM", "QUALITY_ISSUE", "OVERSTOCK", "CUSTOMER_RETURN"];
  const pairs = await prisma.channelStock.findMany({ include: { sku: true } });
  for (let k = 0; k < 44; k++) {
    const p = pairs[between(0, pairs.length - 1)];
    const reason = reasons[between(0, reasons.length - 1)];
    const qty = between(5, 60);
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - between(0, 20));

    let status = rng() < 0.5 ? "INITIATED" : "IN_QC";
    let disposition: string | null = null;
    let recoveredValue = 0;
    let restocked = false;
    let processedAt: Date | null = null;

    if (rng() < 0.65) {
      // resell is more likely for non-quality reasons
      const resellLikely = ["WRONG_ITEM", "OVERSTOCK", "CUSTOMER_RETURN"].includes(reason);
      const roll = rng();
      disposition = resellLikely
        ? roll < 0.7 ? "RESELL" : roll < 0.85 ? "REFURBISH" : roll < 0.95 ? "RECYCLE" : "DISPOSE"
        : roll < 0.25 ? "RESELL" : roll < 0.5 ? "REFURBISH" : roll < 0.8 ? "RECYCLE" : "DISPOSE";
      recoveredValue = Math.round(qty * p.sku.mrp * RECOVERY[disposition]);
      restocked = disposition === "RESELL";
      status = "DISPOSITIONED";
      processedAt = new Date(createdAt.getTime() + between(4, 30) * 3600 * 1000);
    }

    await prisma.return.create({
      data: {
        skuId: p.skuId,
        channelId: p.channelId,
        mfcId: p.mfcId ?? mfcs[0].id,
        qty,
        reason,
        status,
        disposition,
        recoveredValue,
        restocked,
        processedAt,
        createdAt,
      },
    });
  }

  // ---- OutNIF cross-border corridor: lanes + shipments ----
  const laneSeed = [
    { name: "India → UAE", origin: "Mumbai (Nhava Sheva)", destination: "Dubai (Jebel Ali)", traditionalCostUsd: 2800, outnifCostUsd: 1850, traditionalTransitDays: 9, outnifTransitDays: 6, sequence: 1 },
    { name: "India → KSA", origin: "Mumbai (Nhava Sheva)", destination: "Riyadh", traditionalCostUsd: 3400, outnifCostUsd: 2300, traditionalTransitDays: 13, outnifTransitDays: 8, sequence: 2 },
    { name: "UAE → EU", origin: "Dubai (Jebel Ali)", destination: "Rotterdam", traditionalCostUsd: 3200, outnifCostUsd: 2400, traditionalTransitDays: 16, outnifTransitDays: 12, sequence: 3 },
    { name: "KSA → EU", origin: "Jeddah", destination: "Hamburg", traditionalCostUsd: 2900, outnifCostUsd: 2200, traditionalTransitDays: 15, outnifTransitDays: 11, sequence: 4 },
    { name: "India → EU (via UAE)", origin: "Mumbai (Nhava Sheva)", destination: "Rotterdam", traditionalCostUsd: 5800, outnifCostUsd: 4100, traditionalTransitDays: 28, outnifTransitDays: 17, sequence: 5 },
    { name: "India → US East Coast", origin: "Mumbai (Nhava Sheva)", destination: "Newark", traditionalCostUsd: 6500, outnifCostUsd: 4800, traditionalTransitDays: 32, outnifTransitDays: 21, sequence: 6 },
  ];
  const lanes = [];
  for (const l of laneSeed) lanes.push(await prisma.tradeLane.create({ data: l }));

  const FLOW = ["BOOKED", "CONSOLIDATING", "IN_TRANSIT", "CUSTOMS", "AT_HUB", "OUT_FOR_DELIVERY", "DELIVERED"];
  const categories = ["FMCG", "PHARMA", "CONSUMER_DURABLES", "COLD_CHAIN"];
  const hsCodes = ["2106.90", "3004.90", "8517.13", "0406.10"];
  const allBrands = await prisma.brand.findMany();

  for (let s = 0; s < 11; s++) {
    const lane = lanes[between(0, lanes.length - 1)];
    const catIdx = between(0, categories.length - 1);
    const targetIdx = between(0, FLOW.length - 1);
    const ref = `OUTNIF-${String(s + 1).padStart(5, "0")}`;
    const tempControlled = categories[catIdx] === "COLD_CHAIN" || (categories[catIdx] === "PHARMA" && rng() < 0.5);
    const bookedDaysAgo = between(2, 20);
    const bookedAt = new Date();
    bookedAt.setUTCDate(bookedAt.getUTCDate() - bookedDaysAgo);

    const etaAt = new Date(bookedAt);
    etaAt.setUTCDate(etaAt.getUTCDate() + lane.outnifTransitDays);

    const shipment = await prisma.shipment.create({
      data: {
        reference: ref,
        laneId: lane.id,
        brandId: rng() < 0.7 ? allBrands[between(0, allBrands.length - 1)].id : null,
        containerNo: `CNTR${between(100000, 999999)}`,
        hsCode: hsCodes[catIdx],
        category: categories[catIdx],
        tempControlled,
        valueUsd: between(20000, 180000),
        status: FLOW[targetIdx],
        departedAt: targetIdx >= 2 ? new Date(bookedAt.getTime() + 2 * 86400000) : null,
        deliveredAt: targetIdx === FLOW.length - 1 ? etaAt : null,
        etaAt,
        createdAt: bookedAt,
      },
    });

    // backfill the milestone trail up to the current status
    const milestones = [];
    for (let m = 0; m <= targetIdx; m++) {
      const at = new Date(bookedAt.getTime() + (m * lane.outnifTransitDays * 86400000) / FLOW.length);
      const loc = m === FLOW.length - 1 ? lane.destination : m >= 3 ? "Border / Hub" : lane.origin;
      milestones.push({ shipmentId: shipment.id, status: FLOW[m], location: loc, at });
    }
    await prisma.shipmentMilestone.createMany({ data: milestones });
  }

  // ---- Collection App: accounts-receivable invoices ----
  const now = new Date();
  const invStatus = (amount: number, paid: number, due: Date) =>
    paid >= amount ? "PAID" : due.getTime() < now.getTime() ? "OVERDUE" : paid > 0 ? "PARTIAL" : "OPEN";

  for (let n = 0; n < 46; n++) {
    const ch = channels[between(0, channels.length - 1)];
    const brand = rng() < 0.8 ? allBrands[between(0, allBrands.length - 1)] : null;
    const amount = between(40, 820) * 1000;
    const issuedAt = new Date();
    issuedAt.setUTCDate(issuedAt.getUTCDate() - between(2, 80));
    const dueDate = new Date(issuedAt);
    dueDate.setUTCDate(dueDate.getUTCDate() + 30); // net-30 terms

    const roll = rng();
    let paidAmount = 0;
    if (roll < 0.4) paidAmount = amount; // fully paid
    else if (roll < 0.6) paidAmount = Math.round(amount * (0.2 + rng() * 0.5)); // partial
    // else unpaid

    await prisma.invoice.create({
      data: {
        number: `INV-${String(n + 1).padStart(5, "0")}`,
        channelId: ch.id,
        brandId: brand?.id ?? null,
        amount,
        paidAmount,
        status: invStatus(amount, paidAmount, dueDate),
        issuedAt,
        dueDate,
      },
    });
  }

  // ---- Delivery App: last-mile trips MFC -> channel ----
  const drivers = ["Ravi Kumar", "Imran Shaikh", "Suresh Patil", "Anand Rao", "Vikram Singh", "Manoj Yadav", "Prakash N"];
  const DSTATES = ["PENDING", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERED", "FAILED"];
  for (let t = 0; t < 26; t++) {
    const mfc = mfcs[between(0, mfcs.length - 1)];
    const ch = channels[between(0, channels.length - 1)];
    const status = DSTATES[between(0, DSTATES.length - 1)];
    const slaHours = ch.type === "Q_COMMERCE" ? 12 : 24;
    const createdAt = new Date();
    createdAt.setUTCHours(createdAt.getUTCHours() - between(1, 40));
    const etaAt = new Date(createdAt.getTime() + slaHours * 3600 * 1000);
    const dispatchedAt = ["DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status)
      ? new Date(createdAt.getTime() + between(1, 4) * 3600 * 1000)
      : null;
    const deliveredAt = status === "DELIVERED" ? new Date(createdAt.getTime() + between(6, 28) * 3600 * 1000) : null;
    const onTime = status === "DELIVERED" ? deliveredAt!.getTime() <= etaAt.getTime() : status === "FAILED" ? false : null;

    await prisma.delivery.create({
      data: {
        reference: `TRIP-${String(t + 1).padStart(5, "0")}`,
        mfcId: mfc.id,
        channelId: ch.id,
        status,
        driverName: drivers[between(0, drivers.length - 1)],
        vehicleNo: `KA${between(1, 51)}AB${between(1000, 9999)}`,
        stops: between(1, 8),
        units: between(40, 600),
        slaHours,
        etaAt,
        dispatchedAt,
        deliveredAt,
        onTime,
        createdAt,
      },
    });
  }

  // ---- Portal users: one admin + one user per brand (password: ripplr123) ----
  const pw = hashPw("ripplr123");
  await prisma.user.create({
    data: { email: "admin@ripplr.com", name: "Shashank (Admin)", role: "RIPPLR_ADMIN", passwordHash: pw },
  });
  for (const b of allBrands) {
    const slug = b.name.toLowerCase().replace(/\s+/g, "");
    await prisma.user.create({
      data: { email: `ops@${slug}.com`, name: `${b.name} Ops`, role: "BRAND", brandId: b.id, passwordHash: pw },
    });
  }

  const counts = {
    brands: await prisma.brand.count(),
    skus: await prisma.sku.count(),
    mfcs: await prisma.mfc.count(),
    channels: await prisma.channel.count(),
    inventory: await prisma.inventory.count(),
    channelStock: await prisma.channelStock.count(),
    salesHistory: await prisma.salesHistory.count(),
    returns: await prisma.return.count(),
    tradeLanes: await prisma.tradeLane.count(),
    shipments: await prisma.shipment.count(),
    invoices: await prisma.invoice.count(),
    deliveries: await prisma.delivery.count(),
    users: await prisma.user.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
