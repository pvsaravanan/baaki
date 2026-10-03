import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { json, withUser } from "@/lib/api";
import { createTransaction } from "@/lib/tx-service";
import { transactionSchema } from "@/lib/validation";
import { serializeTransaction } from "@/lib/serialize";
import { buildWhere, toFiniteInt } from "@/lib/query";

const INCLUDE = { tags: { include: { tag: true } }, shares: { include: { contact: true } } } as const;

export const GET = withUser(async (user, req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const where = buildWhere(user.id, params);
  // Clamp paging params: a NaN or negative `take` (Prisma reads a negative take
  // as "from the end", a confusing result) or a negative `skip` must not reach
  // the query.
  const take = Math.min(Math.max(toFiniteInt(params.get("take")) ?? 100, 1), 500);
  const skip = Math.max(toFiniteInt(params.get("skip")) ?? 0, 0);

  // Income/expense totals must cover every row matching the filter, not just
  // the page that's loaded — a client-side sum over `rows` would silently
  // understate the real totals once a filter matches more than `take`.
  const [rows, total, sums] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: INCLUDE,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take,
      skip,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
  ]);

  const totals = sums.reduce(
    (acc, s) => {
      const amount = s._sum.amount ?? 0;
      if (s.type === "income") acc.income += amount;
      else if (s.type === "expense") acc.expense += amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return json({ transactions: rows.map(serializeTransaction), total, totals });
});

export const POST = withUser(async (user, req: NextRequest) => {
  const body = await req.json();

  const input = transactionSchema.parse(body);
  const id = await createTransaction(user.id, input);
  const row = await prisma.transaction.findUnique({
    where: { id },
    include: INCLUDE,
  });
  return json({ transaction: serializeTransaction(row!) }, { status: 201 });
});
