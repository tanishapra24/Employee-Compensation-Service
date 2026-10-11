import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { EmployeeService, ValidationError, NotFoundError } from '../services/employeeService';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../types';

const employeeService = new EmployeeService();

function createErrorResponse(error: unknown): HttpResponseInit {
  if (error instanceof ValidationError) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
  if (error instanceof NotFoundError) {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }

  const errMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
  return {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Internal Server Error', message: errMessage }),
  };
}

/**
 * Endpoint: /api/employees
 * GET  - Retrieve list of employees (optional query param: ?departmentId=1&applyDefaultBonus=true)
 * POST - Create a new employee
 */
app.http('employeesCollection', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'employees',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      if (request.method === 'GET') {
        const deptParam = request.query.get('departmentId');
        const defaultBonusParam = request.query.get('applyDefaultBonus');

        const departmentId = deptParam ? parseInt(deptParam, 10) : undefined;
        const applyDefaultBonus =
          defaultBonusParam === 'true' || process.env.APPLY_DEFAULT_BONUS === 'true';

        const employees = await employeeService.listEmployees(departmentId, applyDefaultBonus);
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, count: employees.length, data: employees }),
        };
      }

      if (request.method === 'POST') {
        let body: CreateEmployeeDto;
        try {
          body = (await request.json()) as CreateEmployeeDto;
        } catch {
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Invalid JSON request payload.' }),
          };
        }

        const created = await employeeService.createEmployee(body);
        return {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            Location: `/api/employees/${created.EmployeeID}`,
          },
          body: JSON.stringify({
            success: true,
            message: 'Employee created successfully.',
            data: created,
          }),
        };
      }

      return { status: 405, body: 'Method Not Allowed' };
    } catch (error) {
      context.error('Error handling /api/employees:', error);
      return createErrorResponse(error);
    }
  },
});

/**
 * Endpoint: /api/employees/{id}
 * GET    - Retrieve a single employee by ID
 * PUT    - Update an existing employee
 * DELETE - Delete an employee
 */
app.http('employeeItem', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'employees/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const idParam = request.params.id;
      const id = parseInt(idParam, 10);
      if (isNaN(id)) {
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Employee ID must be a valid integer.' }),
        };
      }

      if (request.method === 'GET') {
        const defaultBonusParam = request.query.get('applyDefaultBonus');
        const applyDefaultBonus =
          defaultBonusParam === 'true' || process.env.APPLY_DEFAULT_BONUS === 'true';

        const employee = await employeeService.getEmployeeById(id, applyDefaultBonus);
        if (!employee) {
          return {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: `Employee with ID ${id} not found.` }),
          };
        }

        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, data: employee }),
        };
      }

      if (request.method === 'PUT') {
        let body: UpdateEmployeeDto;
        try {
          body = (await request.json()) as UpdateEmployeeDto;
        } catch {
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Invalid JSON request payload.' }),
          };
        }

        const updated = await employeeService.updateEmployee(id, body);
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            message: 'Employee updated successfully.',
            data: updated,
          }),
        };
      }

      if (request.method === 'DELETE') {
        await employeeService.deleteEmployee(id);
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            message: `Employee with ID ${id} deleted successfully.`,
          }),
        };
      }

      return { status: 405, body: 'Method Not Allowed' };
    } catch (error) {
      context.error(`Error handling /api/employees/${request.params.id}:`, error);
      return createErrorResponse(error);
    }
  },
});
