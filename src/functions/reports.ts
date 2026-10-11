import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ReportService } from '../services/reportService';

const reportService = new ReportService();

function createErrorResponse(error: unknown): HttpResponseInit {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  return {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Internal Server Error', message }),
  };
}

/**
 * Part B.1 - Total bonus paid across the whole company (NULL treated as 0)
 * GET /api/reports/total-bonus
 */
app.http('reportTotalBonus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/total-bonus',
  handler: async (_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const data = await reportService.getTotalBonus();
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data }),
      };
    } catch (error) {
      context.error('Error handling /api/reports/total-bonus:', error);
      return createErrorResponse(error);
    }
  },
});

/**
 * Part B.2 - List of all employees who have never received a bonus
 * GET /api/reports/no-bonus-employees
 */
app.http('reportNoBonusEmployees', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/no-bonus-employees',
  handler: async (_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const data = await reportService.getEmployeesWithoutBonus();
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, count: data.length, data }),
      };
    } catch (error) {
      context.error('Error handling /api/reports/no-bonus-employees:', error);
      return createErrorResponse(error);
    }
  },
});

/**
 * Part B.3 - Bonus as percentage of salary (rounded to 2 decimal places) for employees with bonus
 * GET /api/reports/bonus-percentage
 */
app.http('reportBonusPercentage', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/bonus-percentage',
  handler: async (_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const data = await reportService.getBonusPercentages();
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, count: data.length, data }),
      };
    } catch (error) {
      context.error('Error handling /api/reports/bonus-percentage:', error);
      return createErrorResponse(error);
    }
  },
});

/**
 * Part B.4 - Departments where total bonus paid exceeds the department's average salary
 * GET /api/reports/departments-high-bonus
 */
app.http('reportHighBonusDepartments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/departments-high-bonus',
  handler: async (_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const data = await reportService.getDepartmentsWhereBonusExceedsAvgSalary();
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, count: data.length, data }),
      };
    } catch (error) {
      context.error('Error handling /api/reports/departments-high-bonus:', error);
      return createErrorResponse(error);
    }
  },
});

/**
 * Part B.5 - Employees ranked by bonus amount, with NULL bonus employees ranked last
 * GET /api/reports/ranked-by-bonus
 */
app.http('reportRankedByBonus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/ranked-by-bonus',
  handler: async (_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const data = await reportService.getEmployeesRankedByBonus();
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, count: data.length, data }),
      };
    } catch (error) {
      context.error('Error handling /api/reports/ranked-by-bonus:', error);
      return createErrorResponse(error);
    }
  },
});

/**
 * Part B.6 - Highest base salary and separately whether that same person has highest total compensation
 * GET /api/reports/highest-compensation
 */
app.http('reportHighestCompensation', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reports/highest-compensation',
  handler: async (_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const data = await reportService.getHighestCompensationAnalysis();
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data }),
      };
    } catch (error) {
      context.error('Error handling /api/reports/highest-compensation:', error);
      return createErrorResponse(error);
    }
  },
});
