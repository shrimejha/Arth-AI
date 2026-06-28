/**
 * Avatar Base — Salary Day Auto-Split Algorithm (Young Employed)
 */

class SalarySplitter {
    constructor(salary, rules) {
        this.salary = salary;
        this.rules = rules || {
            needs: 0.50,
            wants: 0.30,
            investments: 0.20
        };
    }

    calculateSplit() {
        return {
            total: this.salary,
            needs: Math.round(this.salary * this.rules.needs),
            wants: Math.round(this.salary * this.rules.wants),
            investments: Math.round(this.salary * this.rules.investments)
        };
    }

    getInvestmentBreakdown() {
        const investAmount = Math.round(this.salary * this.rules.investments);
        return {
            totalInvestments: investAmount,
            elssSIP: Math.round(investAmount * 0.40), // 40% into ELSS for 80C
            nifty50Index: Math.round(investAmount * 0.40),
            emergencyLiquidFund: Math.round(investAmount * 0.20)
        };
    }
}

// Attach to window for global usage in segment pages
window.SalarySplitter = SalarySplitter;
