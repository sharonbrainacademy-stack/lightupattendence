import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to format date for VTPass Request ID (YYYYMMDDHHMMSS + random 4 digits)
function generateVTPassRequestId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `${year}${month}${day}${hours}${mins}${secs}_${randomStr}`;
}

// Map app network names to VTPass serviceIDs
function getVTPassServiceID(network: string): string {
  const clean = (network || '').toLowerCase().trim();
  if (clean.includes('mtn')) return 'mtn';
  if (clean.includes('glo')) return 'glo';
  if (clean.includes('airtel')) return 'airtel';
  if (clean.includes('9mobile') || clean.includes('etisalat')) return 'etisalat';
  return 'mtn'; // fallback
}

// API Route: Check VTPass Wallet Balance
app.post("/api/vtpass/balance", async (req, res) => {
  try {
    const { apiKey, secretKey, publicKey, mode } = req.body || {};
    const effectiveApiKey = apiKey || process.env.VTPASS_API_KEY;
    const effectiveSecretKey = secretKey || process.env.VTPASS_SECRET_KEY;
    const effectivePublicKey = publicKey || process.env.VTPASS_PUBLIC_KEY;
    const effectiveMode = mode || process.env.VTPASS_MODE || 'sandbox';

    if (!effectiveApiKey || !effectiveSecretKey) {
      return res.json({
        configured: false,
        message: 'VTPass API keys not provided.'
      });
    }

    const baseUrl = effectiveMode === 'live'
      ? 'https://vtpass.com/api/balance'
      : 'https://sandbox.vtpass.com/api/balance';

    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'api-key': effectiveApiKey,
        'secret-key': effectiveSecretKey,
        'public-key': effectivePublicKey || '',
      }
    });

    const data = await response.json();
    return res.json({
      configured: true,
      data
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to check balance' });
  }
});

// API Route: VTPass Automated Airtime Topup
app.post("/api/vtpass/topup", async (req, res) => {
  try {
    const { network, phone, amount, apiKey, secretKey, publicKey, mode, ministerName, beneficiaryName } = req.body;

    const effectiveApiKey = apiKey || process.env.VTPASS_API_KEY;
    const effectiveSecretKey = secretKey || process.env.VTPASS_SECRET_KEY;
    const effectivePublicKey = publicKey || process.env.VTPASS_PUBLIC_KEY;
    const effectiveMode = mode || process.env.VTPASS_MODE || 'sandbox';

    // Format phone number to standard 11 digits format (e.g. 08031234567)
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('234')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    }

    // Fallback/Simulated Mode if no keys configured
    if (!effectiveApiKey || !effectiveSecretKey) {
      console.log(`[VTPass Simulation Mode] Topup requested for ${cleanPhone} on ${network} - ₦${amount}`);
      return res.json({
        success: true,
        simulated: true,
        requestId: `SIM_${Date.now()}`,
        status: 'DELIVERED (Simulated)',
        message: `Airtime dispatch simulation complete. To send live real airtime, enter your VTPass API keys in Settings.`,
        amount,
        phone: cleanPhone,
        network
      });
    }

    const serviceID = getVTPassServiceID(network);
    const requestId = generateVTPassRequestId();

    const baseUrl = effectiveMode === 'live'
      ? 'https://vtpass.com/api/pay'
      : 'https://sandbox.vtpass.com/api/pay';

    console.log(`[VTPass Live Request] ${effectiveMode.toUpperCase()} - Service: ${serviceID}, Phone: ${cleanPhone}, Amt: ₦${amount}, RequestID: ${requestId}`);

    const payload = {
      request_id: requestId,
      serviceID: serviceID,
      amount: Number(amount),
      phone: cleanPhone
    };

    const vtpassResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': effectiveApiKey,
        'secret-key': effectiveSecretKey,
        'public-key': effectivePublicKey || '',
      },
      body: JSON.stringify(payload)
    });

    const result: any = await vtpassResponse.json();
    console.log(`[VTPass Response]`, JSON.stringify(result));

    // Check VTPass response codes: "000" = TRANSACTION SUCCESSFUL / DELIVERED
    if (result.code === "000" || result.code === "099") {
      return res.json({
        success: true,
        simulated: false,
        code: result.code,
        requestId: requestId,
        transactionId: result.content?.transactions?.transactionId || requestId,
        status: result.content?.transactions?.status || 'DELIVERED',
        amount,
        phone: cleanPhone,
        network,
        raw: result
      });
    } else {
      // VTPass error or insufficient balance
      const errorMsg = result.response_description || result.message || 'VTPass transaction failed.';
      return res.status(400).json({
        success: false,
        code: result.code,
        error: errorMsg,
        raw: result
      });
    }

  } catch (err: any) {
    console.error('VTPass Topup Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process VTPass topup'
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
