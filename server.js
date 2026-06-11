require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const META_API_VERSION = 'v19.0';

function hashSHA256(value) {
  if (!value) return undefined;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

app.post('/api/send-event', async (req, res) => {
  const {
    pixelId,
    accessToken,
    eventName,
    formId,
    eventDate,
    email,
    phone,
    firstName,
    lastName,
    testEventCode,
  } = req.body;

  if (!pixelId || !accessToken || !eventName || !formId || !eventDate) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  // Convertir fecha a unix timestamp (inicio del día en UTC)
  const eventTime = Math.floor(new Date(eventDate).getTime() / 1000);

  const userData = {
    client_ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
    client_user_agent: req.headers['user-agent'] || 'Mozilla/5.0',
  };

  if (email) userData.em = hashSHA256(email);
  if (phone) userData.ph = hashSHA256(phone.replace(/\D/g, ''));
  if (firstName) userData.fn = hashSHA256(firstName);
  if (lastName) userData.ln = hashSHA256(lastName);

  const event = {
    event_name: eventName,
    event_time: eventTime,
    action_source: 'other',
    user_data: userData,
    custom_data: {
      lead_id: formId,
    },
  };

  const payload = {
    data: [event],
  };

  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

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

    return res.json({ success: true, result: data });
  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Meta API', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
