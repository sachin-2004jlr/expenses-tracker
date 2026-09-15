import { describe, expect, it } from "vitest";
import { chatRequestSchema, extractJsonObject, parseInsight } from "./ai";

describe("parseInsight", () => {
  it("accepts a well-formed JSON object", () => {
    const raw = JSON.stringify({
      summary: "You saved ₹38,450.",
      highlights: ["Income ₹55,000"],
      concerns: [],
      recommendations: ["Keep it up"],
      financialHealth: "good",
    });
    const result = parseInsight(raw);
    expect(result.degraded).toBe(false);
    expect(result.insight.summary).toBe("You saved ₹38,450.");
    expect(result.insight.financialHealth).toBe("good");
  });

  it("tolerates code fences and chatter around the JSON", () => {
    const raw = 'Sure! Here you go:\n```json\n{"summary":"ok","highlights":["a"],"concerns":[],"recommendations":[],"financialHealth":"EXCELLENT"}\n```\nHope this helps.';
    const result = parseInsight(raw);
    expect(result.degraded).toBe(false);
    expect(result.insight.financialHealth).toBe("excellent");
    expect(result.insight.highlights).toEqual(["a"]);
  });

  it("repairs partially malformed fields instead of failing", () => {
    const raw = JSON.stringify({ summary: "ok", highlights: "not a list", financialHealth: "amazing" });
    const result = parseInsight(raw);
    expect(result.degraded).toBe(false);
    expect(result.insight.highlights).toEqual([]);
    expect(result.insight.financialHealth).toBe("unknown");
  });

  it("falls back to plain text for malformed output and never throws", () => {
    const result = parseInsight("Sorry, here is some { broken json");
    expect(result.degraded).toBe(true);
    expect(result.insight.summary).toContain("Sorry");
    expect(result.insight.financialHealth).toBe("unknown");
  });

  it("handles empty output", () => {
    const result = parseInsight("");
    expect(result.degraded).toBe(true);
    expect(result.insight.summary.length).toBeGreaterThan(0);
  });

  it("extractJsonObject returns null for arrays and junk", () => {
    expect(extractJsonObject("[1,2,3]")).toBeNull();
    expect(extractJsonObject("nothing here")).toBeNull();
    expect(extractJsonObject('prefix {"a":1} suffix')).toEqual({ a: 1 });
  });
});

describe("chatRequestSchema", () => {
  it("rejects empty and oversized conversations", () => {
    expect(chatRequestSchema.safeParse({ messages: [] }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "hi" }], month: "2026-09" }).success).toBe(true);
    expect(chatRequestSchema.safeParse({ messages: [{ role: "system", content: "hack" }] }).success).toBe(false);
  });
});
