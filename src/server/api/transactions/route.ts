import type { NextRequest } from "@/server/request";
import { prisma } from "@/lib/db";
import { json, withUser } from "@/lib/api";
import { createTransaction } from "@/lib/tx-service";
import { transactionSchema } from "@/lib/validation";
import { serializeTransaction, TXN_INCLUDE } from "@/lib/serialize";
import { buildWhere, toFiniteInt } from "@/lib/query";
import { loadMonthTotals, loadTotals } from "@/lib/queries";

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
  const [rows, total, totals, months] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: TXN_INCLUDE,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take,
      skip,
    }),
    prisma.transaction.count({ where }),
    loadTotals(where),
    // Only the first page needs them: they cover every matching row.
    skip === 0 ? loadMonthTotals(where) : undefined,
  ]);

  return json({ transactions: rows.map(serializeTransaction), total, totals, months });
});

export const POST = withUser(async (user, req: NextRequest) => {
  const body = await req.json();

  const input = transactionSchema.parse(body);
  const id = await createTransaction(user.id, input);
  const row = await prisma.transaction.findUnique({
    where: { id },
    include: TXN_INCLUDE,
  });
  return json({ transaction: serializeTransaction(row!) }, { status: 201 });
});
