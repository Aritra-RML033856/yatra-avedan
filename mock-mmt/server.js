
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

// 1. Booking Flow UI
app.get('/', (req, res) => {
    const { trip_id, redirect_url, emp_id, rm, ta, context } = req.query;

    if (!trip_id || !redirect_url) {
        return res.send('<h1>Error: Missing trip_id or redirect_url params</h1>');
    }

    let searchContext = {};
    try {
        const decoded = JSON.parse(decodeURIComponent(context));
        if (Array.isArray(decoded) && decoded.length > 0) {
            searchContext = decoded[0]; // Use first item for main display
        }
    } catch (e) {
        console.log("Error parsing context", e);
    }

    const type = searchContext.type || 'flight';
    let resultsHtml = '';
    let title = 'Select Travel Option';

    if (type === 'flight') {
        const origin = searchContext.departFrom || 'DEL';
        const dest = searchContext.arriveAt || 'BOM';
        const date = searchContext.departureDate || '2024-04-01';
        title = `Flights: ${origin} to ${dest} on ${date}`;

        resultsHtml = `
            <div class="option-card">
                <div>
                    <strong>Indigo 6E-205</strong> (${searchContext.classPreference || 'Economy'})<br>
                    <span style="font-size: 14px; color: #555;">09:00 AM - 11:30 AM | ${origin} -> ${dest}</span>
                </div>
                <div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">₹4,500</div>
                    <button class="btn" onclick="selectOption('Indigo 6E-205 (${origin}-${dest})', 4500)">Select</button>
                </div>
            </div>
            <div class="option-card">
                <div>
                    <strong>Air India AI-809</strong> (${searchContext.classPreference || 'Economy'})<br>
                    <span style="font-size: 14px; color: #555;">14:15 PM - 16:45 PM | ${origin} -> ${dest}</span>
                </div>
                <div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">₹5,200</div>
                    <button class="btn" onclick="selectOption('Air India AI-809 (${origin}-${dest})', 5200)">Select</button>
                </div>
            </div>`;
    } else if (type === 'hotel') {
        const loc = searchContext.location || 'Mumbai';
        const checkin = searchContext.checkinDate || '2024-04-01';
        title = `Hotels in ${loc} (${checkin})`;

        resultsHtml = `
            <div class="option-card">
                <div>
                    <strong>Taj Lands End</strong><br>
                    <span style="font-size: 14px; color: #555;">${loc} | 5 Star | Luxury Room</span>
                </div>
                <div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">₹18,500</div>
                    <button class="btn" onclick="selectOption('Taj Lands End - ${loc}', 18500)">Select</button>
                </div>
            </div>
            <div class="option-card">
                <div>
                    <strong>Hyatt Regency</strong><br>
                    <span style="font-size: 14px; color: #555;">${loc} | 5 Star | Club Room</span>
                </div>
                <div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">₹12,200</div>
                    <button class="btn" onclick="selectOption('Hyatt Regency - ${loc}', 12200)">Select</button>
                </div>
            </div>`;
    } else if (type === 'car') {
        const from = searchContext.pickupLocation || 'Airport';
        const to = searchContext.dropoffLocation || 'City Center';
        title = `Car Rental: ${from} to ${to}`;

        resultsHtml = `
            <div class="option-card">
                <div>
                    <strong>Toyota Innova Crysta</strong><br>
                    <span style="font-size: 14px; color: #555;">SUV | AC | 6 Seater</span>
                </div>
                <div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">₹3,500</div>
                    <button class="btn" onclick="selectOption('Toyota Innova Crysta (${from}-${to})', 3500)">Select</button>
                </div>
            </div>`;
    } else if (type === 'train') {
        const origin = searchContext.departFrom || 'NDLS';
        const dest = searchContext.arriveAt || 'BCT';
        title = `Trains: ${origin} to ${dest}`;

        resultsHtml = `
            <div class="option-card">
                <div>
                    <strong>Rajdhani Express (12952)</strong><br>
                    <span style="font-size: 14px; color: #555;">16:30 - 08:30 (+1) | ${origin} -> ${dest}</span>
                </div>
                <div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">₹3,100</div>
                    <button class="btn" onclick="selectOption('Rajdhani Exp 12952 (${origin}-${dest})', 3100)">Select</button>
                </div>
            </div>`;
    }

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mock MMT Portal</title>
        <style>
            body { font-family: Segoe UI, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); width: 600px; text-align: center; }
            .logo { color: #d32f2f; font-weight: bold; font-size: 24px; marginBottom: 20px; display: block; }
            h2 { color: #333; margin-bottom: 10px; }
            .subtitle { color: #666; margin-bottom: 30px; font-size: 16px; }
            .option-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: left; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
            .option-card:hover { border-color: #d32f2f; background: #fff5f5; }
            .btn { background: #d32f2f; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; }
            .btn:hover { background: #b71c1c; }
            .meta { font-size: 13px; color: #666; margin-bottom: 20px; background: #eee; padding: 10px; border-radius: 4px; text-align: left; }
        </style>
    </head>
    <body>
        <div class="container">
            <span class="logo">MakeMyTrip (Mock)</span>
            <h2>${title}</h2>
            <div class="subtitle">Mocking options based on payload context</div>
            
            <div class="meta">
                <strong>Booking for User:</strong> ${emp_id || 'Unknown'}<br>
                <strong>Trip ID:</strong> ${trip_id}<br>
                <strong>Raw Payload (First Item):</strong> <pre style="margin:5px 0 0 0; white-space:pre-wrap; font-size:11px;">${JSON.stringify(searchContext, null, 2)}</pre>
            </div>

            ${resultsHtml}

            <script>
                function selectOption(option, cost) {
                    const redirectUrl = "${redirect_url}";
                    const tripId = "${trip_id}";
                    const rm = "${rm}";
                    const ta = "${ta}";
                    
                    // Create Payload
                    const payload = {
                        trip_id: tripId,
                        booking_id: "MMT-BKG-" + Math.floor(Math.random() * 100000),
                        option_details: option,
                        cost: cost,
                        rm_approved: rm === 'true',
                        ta_approved: ta === 'true',
                        status: 'INITIATED'
                    };

                    // Redirect back to callback
                    const finalUrl = \`\${redirectUrl}?trip_id=\${tripId}&option=\${encodeURIComponent(option)}&cost=\${cost}&mmt_payload=\${encodeURIComponent(JSON.stringify(payload))}\`;
                    window.location.href = finalUrl;
                }
            </script>
        </div>
    </body>
    </html>
    `);
});

// 2. Completion Handshake (Backend calls this)
app.post('/complete', (req, res) => {
    console.log("-----------------------------------------");
    console.log("✅ REQUEST COMPLETED ON MMT (MOCK) SIDE");
    console.log("Payload Received:", req.body);
    console.log("Ticket Generated: TKT-" + Date.now());
    console.log("Invoice Generated: INV-" + Date.now());
    console.log("-----------------------------------------");
    res.json({ success: true, message: "Booking Finalized on MMT" });
});

app.listen(PORT, () => {
    console.log(`Mock MMT Server running on http://localhost:${PORT}`);
});
