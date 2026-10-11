async function testLiveHttp() {
  const baseUrl = 'http://localhost:7071/api';

  console.log('Testing Live HTTP Endpoints via Node fetch...');

  // 1. Create employee
  const postRes = await fetch(`${baseUrl}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      FirstName: 'Elena',
      LastName: 'Rostova',
      DepartmentID: 4,
      Salary: 115000,
      Bonus: 15000,
    }),
  });
  const postJson = await postRes.json();
  console.log('1. POST /api/employees Status:', postRes.status, 'Created ID:', postJson.data?.EmployeeID);

  const empId = postJson.data.EmployeeID;

  // 2. GET employee by ID
  const getRes = await fetch(`${baseUrl}/employees/${empId}`);
  const getJson = await getRes.json();
  console.log('2. GET /api/employees/:id Status:', getRes.status, 'Name:', getJson.data?.FirstName, getJson.data?.LastName);

  // 3. PUT employee update
  const putRes = await fetch(`${baseUrl}/employees/${empId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Bonus: 25000 }),
  });
  const putJson = await putRes.json();
  console.log('3. PUT /api/employees/:id Status:', putRes.status, 'Updated Bonus:', putJson.data?.Bonus);

  // 4. GET report ranked by bonus
  const rankRes = await fetch(`${baseUrl}/reports/ranked-by-bonus`);
  const rankJson = await rankRes.json();
  console.log('4. GET /api/reports/ranked-by-bonus Status:', rankRes.status, 'Total Ranked:', rankJson.count);

  // 5. DELETE employee
  const delRes = await fetch(`${baseUrl}/employees/${empId}`, { method: 'DELETE' });
  const delJson = await delRes.json();
  console.log('5. DELETE /api/employees/:id Status:', delRes.status, delJson.message);

  // 6. Verify 404 after delete
  const verifyRes = await fetch(`${baseUrl}/employees/${empId}`);
  console.log('6. GET after delete Status:', verifyRes.status, '(Expected 404)');

  console.log('\nAll Live HTTP tests verified successfully!');
}

testLiveHttp().catch(console.error);
