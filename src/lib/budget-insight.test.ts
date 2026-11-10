import { describe, expect, it } from "vitest";
import { budgetInsight } from "./budget-insight";
import { budgetStatus } from "./calculations";

const SEP = { year: 2026, month: 9 };
const onDay = (day: number) => new Date(Date.UTC(2026, 8, day, 6, 30)); // midday in India
const spent = (percent: number) => budgetStatus(percent * 100, 10_000);

describe("budget insight", () => {
  it("is on track when spending keeps pace with the month", () => {
    expect(budgetInsight(spent(72), SEP, onDay(20))).toEqual({
      tone: "good",
      title: "You're on track!",
      message: "You've spent 72% of your total budget with 11 days left.",
    });
  });

  it("warns when spending runs well ahead of the month", () => {
    expect(budgetInsight(spent(60), SEP, onDay(3)).title).toBe("Spending quickly");
  });

  it("warns near the limit and flags going over", () => {
    expect(budgetInsight(spent(92), SEP, onDay(29)).title).toBe("Close to your limit");
    const over = budgetInsight(spent(120), SEP, onDay(29));
    expect(over.tone).toBe("over");
    expect(over.title).toBe("Over budget");
  });

  it("counts today, in the singular, on the last day", () => {
    expect(budgetInsight(spent(50), SEP, onDay(30)).message).toContain("with 1 day left");
  });

  it("looks back on a finished month", () => {
    const now = new Date(Date.UTC(2026, 9, 5));
    expect(budgetInsight(spent(92), SEP, now)).toEqual({
      tone: "good",
      title: "You stayed within budget",
      message: "You spent 92% of your total budget in September 2026.",
    });
    expect(budgetInsight(spent(100), SEP, now).title).toBe("You went over budget");
  });

  it("makes no claim about a month that hasn't started", () => {
    const now = new Date(Date.UTC(2026, 7, 5));
    expect(budgetInsight(spent(0), SEP, now)).toEqual({
      tone: "good",
      title: "Budget set",
      message: "Your budget for September 2026 is ready.",
    });
  });
});
