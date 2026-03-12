import Groq from 'groq-sdk';
import { env } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

interface ChatContext {
  userName: string;
  totalBalance: number;
  accountsCount: number;
  recentTransactions: Array<{
    type: string;
    amount: number;
    description: string;
    category: string;
  }>;
  monthlyIncome: number;
  monthlySpending: number;
  topCategories: Array<{ category: string; total: number }>;
  budgetAlerts: string[];
  currency: string;
}

export class AIService {
  // Get user context for chatbot
  static async getUserContext(userId: string): Promise<ChatContext> {
    // Get user info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('name, preferred_currency')
      .eq('id', userId)
      .single();

    // Get accounts
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, balance, currency')
      .eq('user_id', userId)
      .eq('status', 'active');

    const accountIds = (accounts || []).map((a) => a.id);
    const totalBalance = (accounts || []).reduce(
      (sum, a) => sum + Number(a.balance),
      0
    );

    // Get recent transactions (last 10)
    let recentTransactions: any[] = [];
    if (accountIds.length > 0) {
      const { data: txns } = await supabaseAdmin
        .from('ledger')
        .select('type, amount, description, category')
        .in('account_id', accountIds)
        .gt('amount', 0)
        .order('created_at', { ascending: false })
        .limit(10);
      recentTransactions = txns || [];
    }

    // Get monthly income/spending
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let monthlyIncome = 0;
    let monthlySpending = 0;
    const categoryMap: Record<string, number> = {};

    if (accountIds.length > 0) {
      const { data: monthlyTxns } = await supabaseAdmin
        .from('ledger')
        .select('amount, type, category')
        .in('account_id', accountIds)
        .gte('created_at', startOfMonth.toISOString())
        .gt('amount', 0);

      (monthlyTxns || []).forEach((t) => {
        if (t.type === 'credit') {
          monthlyIncome += Number(t.amount);
        } else {
          monthlySpending += Number(t.amount);
          const cat = t.category || 'Other';
          categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
        }
      });
    }

    const topCategories = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Budget alerts
    const budgetAlerts: string[] = [];
    const { data: budgets } = await supabaseAdmin
      .from('budget_categories')
      .select('category_name, monthly_limit')
      .eq('user_id', userId)
      .eq('is_active', true);

    (budgets || []).forEach((budget) => {
      const spent = categoryMap[budget.category_name] || 0;
      if (Number(budget.monthly_limit) > 0 && spent > Number(budget.monthly_limit)) {
        budgetAlerts.push(
          `Over budget on ${budget.category_name}: spent ${spent.toFixed(2)} of ${Number(
            budget.monthly_limit
          ).toFixed(2)} limit`
        );
      }
    });

    return {
      userName: user?.name || 'User',
      totalBalance,
      accountsCount: accounts?.length || 0,
      recentTransactions,
      monthlyIncome,
      monthlySpending,
      topCategories,
      budgetAlerts,
      currency: user?.preferred_currency || 'USD',
    };
  }

  // Generate AI chat response
  static async chat(
    userId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    try {
      // Get user context
      const context = await this.getUserContext(userId);

      const systemPrompt = `You are FinSync AI Assistant, a helpful and friendly digital banking assistant for FinSync Banking App.

IMPORTANT RULES:
- You are helpful, concise, and professional
- Never reveal actual account numbers, passwords, or sensitive data
- You can discuss balances, spending patterns, budgets, and financial advice
- For actual transactions (transfers, payments), direct users to use the app interface
- Be encouraging about good financial habits
- Give specific, actionable advice based on the user's data
- Use emojis sparingly for friendliness
- Keep responses under 200 words unless detailed analysis is asked
- If asked about something outside banking/finance, politely redirect

USER CONTEXT:
- Name: ${context.userName}
- Total Balance: ${context.currency} ${context.totalBalance.toFixed(2)}
- Number of Accounts: ${context.accountsCount}
- Monthly Income (this month): ${context.currency} ${context.monthlyIncome.toFixed(2)}
- Monthly Spending (this month): ${context.currency} ${context.monthlySpending.toFixed(2)}
- Savings Rate: ${
        context.monthlyIncome > 0
          ? Math.round(
              ((context.monthlyIncome - context.monthlySpending) / context.monthlyIncome) * 100
            )
          : 0
      }%
- Top Spending Categories: ${
        context.topCategories.length > 0
          ? context.topCategories
              .map((c) => `${c.category} (${context.currency} ${c.total.toFixed(2)})`)
              .join(', ')
          : 'No spending data yet'
      }
- Budget Alerts: ${
        context.budgetAlerts.length > 0 ? context.budgetAlerts.join('; ') : 'All budgets on track'
      }
- Recent Transactions: ${
        context.recentTransactions.length > 0
          ? context.recentTransactions
              .slice(0, 5)
              .map((t) => `${t.type}: ${t.amount} - ${t.description}`)
              .join('; ')
          : 'No recent transactions'
      }`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.slice(-10).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message },
      ];

      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: env.GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9,
      });

      const response =
        chatCompletion.choices[0]?.message?.content ||
        "I'm sorry, I couldn't process that. Please try again.";

      return response;
    } catch (error) {
      logger.error('AI chat error:', error);
      return "I'm experiencing some issues right now. Please try again in a moment or contact support if the problem persists.";
    }
  }

  // Generate spending insights
  static async generateInsights(userId: string): Promise<string> {
    try {
      const context = await this.getUserContext(userId);

      const prompt = `Based on this financial data, provide 3-4 brief, actionable insights:
      
- Balance: ${context.currency} ${context.totalBalance.toFixed(2)}
- Monthly Income: ${context.currency} ${context.monthlyIncome.toFixed(2)}
- Monthly Spending: ${context.currency} ${context.monthlySpending.toFixed(2)}
- Top Categories: ${context.topCategories.map((c) => `${c.category}: ${c.total}`).join(', ')}
- Budget Alerts: ${context.budgetAlerts.join(', ') || 'None'}

Provide insights as a JSON array of strings. Be specific and actionable.`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: env.GROQ_MODEL,
        temperature: 0.5,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content || '[]';
    } catch (error) {
      logger.error('AI insights error:', error);
      return '[]';
    }
  }

  // Categorize a transaction description
  static async categorizeTransaction(description: string): Promise<string> {
    try {
      const prompt = `Categorize this transaction into exactly ONE of these categories:
Food & Dining, Shopping, Transportation, Bills & Utilities, Entertainment, Healthcare, Education, Travel, Groceries, Salary, Investment, Transfer, Other

Transaction: "${description}"

Respond with ONLY the category name, nothing else.`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: env.GROQ_MODEL,
        temperature: 0.1,
        max_tokens: 20,
      });

      const category = completion.choices[0]?.message?.content?.trim() || 'Other';

      const validCategories = [
        'Food & Dining',
        'Shopping',
        'Transportation',
        'Bills & Utilities',
        'Entertainment',
        'Healthcare',
        'Education',
        'Travel',
        'Groceries',
        'Salary',
        'Investment',
        'Transfer',
        'Other',
      ];

      return validCategories.includes(category) ? category : 'Other';
    } catch (error) {
      logger.error('AI categorization error:', error);
      return 'Other';
    }
  }
}