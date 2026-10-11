import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { EmployeeService, ValidationError, NotFoundError } from './services/employeeService';
import { ReportService } from './services/reportService';
import { CreateEmployeeDto, UpdateEmployeeDto } from './types';

const employeeService = new EmployeeService();
const reportService = new ReportService();

const PORT = process.env.PORT || 7071;

function sendJson(res: http.ServerResponse, status: number, data: any, headers: Record<string, string> = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...headers,
  });
  res.end(JSON.stringify(data, null, 2));
}

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new ValidationError('Invalid JSON request payload.'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const method = req.method?.toUpperCase() || 'GET';

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  try {
    // Favicon handler
    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      return res.end();
    }

    // Serve Interactive Dashboard for root or browser navigation
    if (pathname === '/' || pathname === '/dashboard') {
      const accept = req.headers.accept || '';
      if (accept.includes('text/html') || !accept.includes('application/json')) {
        const publicHtmlPath = path.resolve(process.cwd(), 'public/index.html');
        if (fs.existsSync(publicHtmlPath)) {
          const html = fs.readFileSync(publicHtmlPath, 'utf8');
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          });
          return res.end(html);
        }
      }

      return sendJson(res, 200, {
        service: 'Employee Compensation Service',
        status: 'online',
        dashboard: 'http://localhost:' + PORT,
        endpoints: [
          'POST   /api/employees',
          'GET    /api/employees',
          'GET    /api/employees/:id',
          'PUT    /api/employees/:id',
          'DELETE /api/employees/:id',
          'GET    /api/reports/total-bonus',
          'GET    /api/reports/no-bonus-employees',
          'GET    /api/reports/bonus-percentage',
          'GET    /api/reports/departments-high-bonus',
          'GET    /api/reports/ranked-by-bonus',
          'GET    /api/reports/highest-compensation',
        ],
      });
    }

    if (pathname === '/api') {
      return sendJson(res, 200, {
        service: 'Employee Compensation Service API',
        status: 'online',
        endpoints: [
          'POST   /api/employees',
          'GET    /api/employees',
          'GET    /api/employees/:id',
          'PUT    /api/employees/:id',
          'DELETE /api/employees/:id',
          'GET    /api/reports/total-bonus',
          'GET    /api/reports/no-bonus-employees',
          'GET    /api/reports/bonus-percentage',
          'GET    /api/reports/departments-high-bonus',
          'GET    /api/reports/ranked-by-bonus',
          'GET    /api/reports/highest-compensation',
        ],
      });
    }

    // -------------------------------------------------------------
    // Part A: Employee CRUD Endpoints
    // -------------------------------------------------------------
    // GET /api/employees and POST /api/employees
    if (pathname === '/api/employees') {
      if (method === 'GET') {
        const deptParam = parsedUrl.searchParams.get('departmentId');
        const defaultBonusParam = parsedUrl.searchParams.get('applyDefaultBonus');
        const departmentId = deptParam ? parseInt(deptParam, 10) : undefined;
        const applyDefaultBonus =
          defaultBonusParam === 'true' || process.env.APPLY_DEFAULT_BONUS === 'true';

        const employees = await employeeService.listEmployees(departmentId, applyDefaultBonus);
        return sendJson(res, 200, { success: true, count: employees.length, data: employees });
      }

      if (method === 'POST') {
        const body = (await parseJsonBody(req)) as CreateEmployeeDto;
        const created = await employeeService.createEmployee(body);
        return sendJson(
          res,
          201,
          {
            success: true,
            message: 'Employee created successfully.',
            data: created,
          },
          { Location: `/api/employees/${created.EmployeeID}` }
        );
      }
    }

    // Single Employee Item: /api/employees/:id
    const employeeIdMatch = pathname.match(/^\/api\/employees\/(\d+)$/);
    if (employeeIdMatch) {
      const id = parseInt(employeeIdMatch[1], 10);

      if (method === 'GET') {
        const defaultBonusParam = parsedUrl.searchParams.get('applyDefaultBonus');
        const applyDefaultBonus =
          defaultBonusParam === 'true' || process.env.APPLY_DEFAULT_BONUS === 'true';

        const employee = await employeeService.getEmployeeById(id, applyDefaultBonus);
        if (!employee) {
          return sendJson(res, 404, { success: false, error: `Employee with ID ${id} not found.` });
        }
        return sendJson(res, 200, { success: true, data: employee });
      }

      if (method === 'PUT') {
        const body = (await parseJsonBody(req)) as UpdateEmployeeDto;
        const updated = await employeeService.updateEmployee(id, body);
        return sendJson(res, 200, {
          success: true,
          message: 'Employee updated successfully.',
          data: updated,
        });
      }

      if (method === 'DELETE') {
        await employeeService.deleteEmployee(id);
        return sendJson(res, 200, {
          success: true,
          message: `Employee with ID ${id} deleted successfully.`,
        });
      }
    }

    // -------------------------------------------------------------
    // Part B: Compensation Reporting Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/reports/total-bonus' && method === 'GET') {
      const data = await reportService.getTotalBonus();
      return sendJson(res, 200, { success: true, data });
    }

    if (pathname === '/api/reports/no-bonus-employees' && method === 'GET') {
      const data = await reportService.getEmployeesWithoutBonus();
      return sendJson(res, 200, { success: true, count: data.length, data });
    }

    if (pathname === '/api/reports/bonus-percentage' && method === 'GET') {
      const data = await reportService.getBonusPercentages();
      return sendJson(res, 200, { success: true, count: data.length, data });
    }

    if (pathname === '/api/reports/departments-high-bonus' && method === 'GET') {
      const data = await reportService.getDepartmentsWhereBonusExceedsAvgSalary();
      return sendJson(res, 200, { success: true, count: data.length, data });
    }

    if (pathname === '/api/reports/ranked-by-bonus' && method === 'GET') {
      const data = await reportService.getEmployeesRankedByBonus();
      return sendJson(res, 200, { success: true, count: data.length, data });
    }

    if (pathname === '/api/reports/highest-compensation' && method === 'GET') {
      const data = await reportService.getHighestCompensationAnalysis();
      return sendJson(res, 200, { success: true, data });
    }

    // Endpoint not matched
    return sendJson(res, 404, {
      success: false,
      error: `Cannot ${method} ${pathname}. Endpoint not found.`,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return sendJson(res, 400, { success: false, error: error.message });
    }
    if (error instanceof NotFoundError) {
      return sendJson(res, 404, { success: false, error: error.message });
    }
    console.error(`Error processing ${method} ${pathname}:`, error);
    return sendJson(res, 500, {
      success: false,
      error: 'Internal Server Error',
      message: error?.message || 'Unknown server error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Employee Compensation Service running on port ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}/api`);
  console.log(` Ready to accept requests.`);
  console.log(`=======================================================`);
});
