import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  const counts = {
    brands: await prisma.brand.count(),
    skus: await prisma.sku.count(),
    mfcs: await prisma.mfc.count(),
    channels: await prisma.channel.count(),
    inventory: await prisma.inventory.count(),
    channelStock: await prisma.channelStock.count(),
    salesHistory: await prisma.salesHistory.count(),
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
