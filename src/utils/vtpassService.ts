export interface VTPassConfig {
  apiKey: string;
  secretKey: string;
  publicKey: string;
  mode: 'live' | 'sandbox';
}

const VTPASS_CONFIG_KEY = 'lightup_vtpass_config_v1';

export function getVTPassConfig(): VTPassConfig {
  try {
    const raw = localStorage.getItem(VTPASS_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading VTPass config:', e);
  }
  return {
    apiKey: '',
    secretKey: '',
    publicKey: '',
    mode: 'live'
  };
}

export function saveVTPassConfig(config: VTPassConfig): void {
  try {
    localStorage.setItem(VTPASS_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving VTPass config:', e);
  }
}

export async function executeVTPassAirtimeTopup(
  network: string,
  phone: string,
  amount: number,
  ministerName: string,
  beneficiaryName: string
): Promise<{ success: boolean; message: string; requestId?: string; simulated?: boolean; raw?: any }> {
  const config = getVTPassConfig();

  try {
    const response = await fetch('/api/vtpass/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        network,
        phone,
        amount,
        ministerName,
        beneficiaryName,
        apiKey: config.apiKey,
        secretKey: config.secretKey,
        publicKey: config.publicKey,
        mode: config.mode
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        message: data.simulated
          ? `Airtime dispatch logged. (Add VTPass API keys in Settings for automatic live credit).`
          : `⚡ VTPass Live Airtime Sent Successfully! (Ref: ${data.requestId})`,
        requestId: data.requestId,
        simulated: data.simulated,
        raw: data
      };
    } else {
      return {
        success: false,
        message: data.error || 'VTPass failed to credit line. Please check your wallet balance or API keys.',
        raw: data
      };
    }
  } catch (err: any) {
    console.error('Network error calling VTPass endpoint:', err);
    return {
      success: false,
      message: err.message || 'Could not connect to server. Please check internet connection.'
    };
  }
}
