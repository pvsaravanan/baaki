import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "@/generated/migrations";

/**
 * The 20261105090000_adopt_split_shares_and_app_lock migration moves a database
 * that already holds people, splits, repayments and goals onto the data model
 * of the app's newer screens. It must add what they need and convert what
 * can be converted, without dropping or losing anything. Build a database with
 * every earlier migration, fill it like a used account, run the migration, and
 * check both halves.
 */
const ADOPT = "20261105090000_adopt_split_shares_and_app_lock";

async function dbBefore(): Promise<PGlite> {
  const db = new PGlite();
  for (const m of MIGRATIONS) {
    if (m.name === ADOPT) break;
    await db.exec(m.sql);
  }
  return db;
}

async function seed(db: PGlite) {
  const now = "2026-11-01T10:00:00Z";
  await db.exec(`
    INSERT INTO "User" ("id","email","name","authId","updatedAt") VALUES ('u1','a@example.com','Asha','auth-1','${now}');
    INSERT INTO "UserPreference" ("id","userId","dashboardWidgets") VALUES ('p1','u1','["balance","income"]');
    INSERT INTO "Account" ("id","userId","name","updatedAt") VALUES ('acc1','u1','Bank','${now}');
    INSERT INTO "Transaction" ("id","userId","type","amount","description","date","accountId","updatedAt") VALUES
      ('t-dinner','u1','expense',90000,'Dinner','${now}','acc1','${now}'),
      ('t-lunch','u1','expense',30000,'Lunch','${now}','acc1','${now}'),
      ('t-pay','u1','income',5000000,'Salary','${now}','acc1','${now}'),
      ('t-repay','u1','repayment',30000,'Ravi paid back','${now}','acc1','${now}');
    INSERT INTO "Contact" ("id","userId","name") VALUES ('c-ravi','u1','Ravi'), ('c-mia','u1','Mia');
    INSERT INTO "ExpenseShare" ("id","transactionId","contactId","amount","direction","settled","settledAt") VALUES
      ('s-ravi-open','t-dinner','c-ravi',30000,'owed_to_you',false,NULL),
      ('s-mia-open','t-dinner','c-mia',30000,'owed_to_you',false,NULL),
      ('s-ravi-paid','t-lunch','c-ravi',15000,'owed_to_you',true,'2026-11-02T09:00:00Z'),
      ('s-nobody','t-lunch',NULL,15000,'owed_to_you',false,NULL),
      ('s-you-owe',NULL,'c-mia',12000,'you_owe',false,NULL);
    INSERT INTO "FinancialGoal" ("id","userId","name","targetAmount","updatedAt") VALUES ('g1','u1','Trip',2000000,'${now}');
    INSERT INTO "GoalContribution" ("id","goalId","amount") VALUES ('gc1','g1',500000);
  `);
}

async function count(db: PGlite, table: string): Promise<number> {
  return Number((await db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM "${table}"`)).rows[0].n);
}

describe("adopting the split-share data model", () => {
  const migration = MIGRATIONS.find((m) => m.name === ADOPT)!;

  it("is the last migration", () => {
    expect(MIGRATIONS[MIGRATIONS.length - 1].name).toBe(ADOPT);
  });

  it("keeps every row of every table it doesn't convert", async () => {
    const db = await dbBefore();
    await seed(db);
    const tables = ["User", "UserPreference", "Account", "Contact", "ExpenseShare", "FinancialGoal", "GoalContribution"];
    const before = Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await count(db, t)])));
    await db.exec(migration.sql);
    for (const t of tables) expect(await count(db, t), t).toBe(before[t]);
    expect(await count(db, "Transaction")).toBe(4);
    // The sign-in link survives.
    const user = await db.query<{ authId: string }>(`SELECT "authId" FROM "User" WHERE "id" = 'u1'`);
    expect(user.rows[0].authId).toBe("auth-1");
  });

  it("carries the shares owed to you over to named splits", async () => {
    const db = await dbBefore();
    await seed(db);
    await db.exec(migration.sql);
    const { rows } = await db.query<{ id: string; transactionId: string; name: string; amount: number; settled: boolean }>(
      `SELECT "id","transactionId","name","amount", ("settledAt" IS NOT NULL) AS settled FROM "SplitShare" ORDER BY "id"`,
    );
    expect(rows).toEqual([
      { id: "s-mia-open", transactionId: "t-dinner", name: "Mia", amount: 30000, settled: false },
      { id: "s-nobody", transactionId: "t-lunch", name: "Someone", amount: 15000, settled: false },
      { id: "s-ravi-open", transactionId: "t-dinner", name: "Ravi", amount: 30000, settled: false },
      { id: "s-ravi-paid", transactionId: "t-lunch", name: "Ravi", amount: 15000, settled: true },
    ]);
    // The standalone "you owe" entry has no transaction to hang a split on: it stays where it was.
    expect(await count(db, "SplitShare")).toBe(4);
    expect(await count(db, "ExpenseShare")).toBe(5);
  });

  it("turns repayments into income, remembers which, and can be reversed", async () => {
    const db = await dbBefore();
    await seed(db);
    await db.exec(migration.sql);
    const type = async (id: string) => (await db.query<{ type: string }>(`SELECT "type" FROM "Transaction" WHERE "id" = '${id}'`)).rows[0].type;
    expect(await type("t-repay")).toBe("income");
    expect(await type("t-dinner")).toBe("expense");
    expect((await db.query(`SELECT "id" FROM "LegacyRepaymentTransaction"`)).rows).toEqual([{ id: "t-repay" }]);
    await db.exec(`UPDATE "Transaction" SET "type" = 'repayment' WHERE "id" IN (SELECT "id" FROM "LegacyRepaymentTransaction")`);
    expect(await type("t-repay")).toBe("repayment");
  });

  it("adds the app lock preference (off) and resets only the untouched dashboard layout", async () => {
    const db = await dbBefore();
    await seed(db);
    await db.exec(`
      INSERT INTO "User" ("id","email","name","updatedAt") VALUES ('u2','b@example.com','Bo','2026-11-01T10:00:00Z');
      INSERT INTO "UserPreference" ("id","userId","dashboardWidgets") VALUES ('p2','u2','["balance","income","expenses","net_savings","savings_rate","budget_left","income_vs_expenses","spending_calendar","recent_transactions","spending_categories","budget_progress","upcoming_recurring","financial_goals","insights"]');
    `);
    await db.exec(migration.sql);
    const prefs = await db.query<{ id: string; appLock: boolean; dashboardWidgets: string }>(
      `SELECT "id","appLock","dashboardWidgets" FROM "UserPreference" ORDER BY "id"`,
    );
    expect(prefs.rows.every((p) => p.appLock === false)).toBe(true);
    expect(prefs.rows[0].dashboardWidgets).toBe('["balance","income"]'); // customised: left alone
    expect(prefs.rows[1].dashboardWidgets).toBe("[]"); // the old default moves to the new one
  });

  it("is safe to run on an empty database", async () => {
    const db = await dbBefore();
    await db.exec(migration.sql);
    expect(await count(db, "SplitShare")).toBe(0);
    expect(await count(db, "LegacyRepaymentTransaction")).toBe(0);
  });
});
