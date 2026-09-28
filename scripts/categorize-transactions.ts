import { prisma } from "../src/lib/db";
import { suggestCategoryKey } from "../src/lib/categorize";

async function main() {
  // Keyed per user: each user's built-in categories share the same keys, so
  // a lookup across everyone would hand one user another user's category.
  const categories = await prisma.category.findMany({ where: { systemKey: { not: null } } });
  const catByUserKey = new Map(categories.map((c) => [`${c.userId}:${c.systemKey}`, c.id]));

  const txs = await prisma.transaction.findMany({
    where: { categoryId: null },
  });

  console.log(`Found ${txs.length} uncategorized transactions.`);

  let updated = 0;
  for (const t of txs) {
    if (t.type === "transfer") {
      // Transfers don't have categories
      continue;
    }

    let suggestedKey = suggestCategoryKey(t.description);

    // Contextual heuristics for common descriptions
    const desc = t.description.toLowerCase();
    if (!suggestedKey) {
      if (desc.includes("dhaba") || desc.includes("tiffin") || desc.includes("juice") || desc.includes("pani puri") || desc.includes("pista house") || desc.includes("cafeteria") || desc.includes("shawarma") || desc.includes("wrap") || desc.includes("tea") || desc.includes("biscuit") || desc.includes("drunken monkey") || desc.includes("noodles") || desc.includes("breakfast") || desc.includes("dinner") || desc.includes("lunch") || desc.includes("kochin spices") || desc.includes("chicken")) {
        suggestedKey = "food";
      } else if (desc.includes("pg") || desc.includes("rent") || desc.includes("advance")) {
        suggestedKey = "housing";
      } else if (desc.includes("auto") || desc.includes("fuel") || desc.includes("cng") || desc.includes("rapido") || desc.includes("bus") || desc.includes("train")) {
        suggestedKey = "transportation";
      } else if (desc.includes("movie") || desc.includes("ticket") || desc.includes("cinema")) {
        suggestedKey = "entertainment";
      } else if (desc.includes("pharmacy") || desc.includes("apollo") || desc.includes("bandaid")) {
        suggestedKey = "healthcare";
      } else if (desc.includes("fruit") || desc.includes("vegetable") || desc.includes("grocer")) {
        suggestedKey = "groceries";
      } else if (desc.includes("mom transferred") || desc.includes("aunt transferred") || desc.includes("bro") || desc.includes("friend")) {
        suggestedKey = t.type === "income" ? "other-income" : "personal";
      } else if (desc.includes("deposited money") || desc.includes("cash")) {
        suggestedKey = t.type === "income" ? "other-income" : "personal";
      }
    }

    if (suggestedKey) {
      const catId = catByUserKey.get(`${t.userId}:${suggestedKey}`);
      if (catId) {
        await prisma.transaction.update({
          where: { id: t.id },
          data: { categoryId: catId },
        });
        console.log(`Categorized [${t.description}] -> ${suggestedKey}`);
        updated++;
      }
    }
  }

  console.log(`\nSuccessfully categorized ${updated} transactions.`);
}

main().finally(() => prisma.$disconnect());
