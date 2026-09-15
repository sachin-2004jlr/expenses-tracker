import { render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Amount } from "./money";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("renders the label, value and a positive change", () => {
    render(<StatCard label="Income" icon={Wallet} tone="income" value="₹55,000" changePercent={14.6} increaseIsGood />);
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("₹55,000")).toBeInTheDocument();
    expect(screen.getByText("14.6%")).toBeInTheDocument();
    expect(screen.getByText("vs last month")).toBeInTheDocument();
  });

  it("explains a missing comparison instead of dividing by zero", () => {
    render(<StatCard label="Expenses" icon={Wallet} value="₹16,550" changePercent={null} increaseIsGood={false} />);
    expect(screen.getByText("no data last month")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders a hint without a change", () => {
    render(<StatCard label="Balance" icon={Wallet} value="₹1,24,500" hint="All-time" />);
    expect(screen.getByText("All-time")).toBeInTheDocument();
    expect(screen.queryByText("vs last month")).not.toBeInTheDocument();
  });
});

describe("Amount", () => {
  it("prefixes income and expenses with + and −", () => {
    render(
      <>
        <Amount paise={5_500_000} type="INCOME" />
        <Amount paise={85_000} type="EXPENSE" />
      </>,
    );
    expect(screen.getByText("+ ₹55,000")).toHaveClass("text-income-foreground");
    expect(screen.getByText("− ₹850")).toHaveClass("text-expense-foreground");
  });

  it("colours by sign when asked", () => {
    render(<Amount paise={-1_500} colorBySign />);
    expect(screen.getByText("-₹15")).toHaveClass("text-expense-foreground");
  });
});
