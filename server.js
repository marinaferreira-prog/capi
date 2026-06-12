require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const META_API_VERSION = 'v19.0';

app.post('/api/send-event', async (req, res) => {
  const { pixelId, accessToken, eventName, eventDate, leadId, leadEventSource, originalEventName, testEventCode } = req.body;

  if (!pixelId || !accessToken || !eventName || !eventDate || !leadId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  const eventTime = Math.floor(new Date(eventDate).getTime() / 1000);

  const event = {
    event_name: eventName,
    event_time: eventTime,
    action_source: 'system_generated',
    user_data: {
      lead_id: leadId,
    },
    custom_data: {
      lead_event_source: leadEventSource || 'Your CRM',
      event_source: 'crm',
    },
    original_event_data: {
      event_name: originalEventName || eventName,
      event_time: eventTime,
    },
  };

  const payload = { data: [event] };
  if (testEventCode) payload.test_event_code = testEventCode;

  const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${accessToken}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Error de Meta API', details: data });
    }

    return res.json({ success: true, result: data, payload });
  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Meta API', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
