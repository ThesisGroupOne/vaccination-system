// Using native fetch (Node 24+). No external dependency needed.

(async () => {
  try {
    const res = await fetch('http://localhost:9999/api/request-vaccine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorName: 'Dr. Test',
        vaccineType: 'Rabies',
        quantity: 10,
        notes: 'Urgent'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
})();
