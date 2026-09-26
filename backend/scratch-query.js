require('dotenv').config();
const http = require('http');

http.get('http://localhost:4000/api/v1/bookings/88888888-8888-8888-8888-888888888803', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const j = JSON.parse(data);
    if (!j.success) { console.log('ERROR:', j.message); return; }
    const d = j.data;
    console.log('✅ status      :', d.status);
    console.log('✅ booker_name :', d.booker_name);
    console.log('✅ branch_name :', d.branch_name);
    console.log('✅ created_at  :', d.created_at);
    console.log('✅ total_amount:', d.total_amount);
    console.log('✅ rooms count :', d.rooms?.length);
    if (d.rooms?.[0]) {
      const r = d.rooms[0];
      console.log('✅ room_number :', r.room_number);
      console.log('✅ room_type   :', r.room_type_name);
      console.log('✅ meal_plan   :', r.meal_plan_name);
    }
  });
}).on('error', e => console.error('Cannot connect to API:', e.message));
