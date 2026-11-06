import { createClient, OAuthStrategy } from "@wix/sdk";

export default async function WixTestPage() {
  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;

  if (!clientId) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1 style={{ color: "crimson" }}>Configuration Missing</h1>
        <p><code>NEXT_PUBLIC_WIX_CLIENT_ID</code> is not defined in your environment variables.</p>
      </div>
    );
  }

  try {
    const client = createClient({
      auth: OAuthStrategy({ clientId }),
    });

    // Request an anonymous visitor tokens payload to verify handshake
    const tokens = await client.auth.generateVisitorTokens();

    return (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1 style={{ color: "green" }}>✓ Wix Connected Successfully</h1>
        <p>Client ID: <code>{clientId.slice(0, 6)}...{clientId.slice(-4)}</code></p>
        <p>Handshake Status: <strong>Token exchange confirmed</strong></p>
        <pre style={{ background: "#f4f4f4", padding: 15, borderRadius: 6 }}>
          {JSON.stringify({ hasAccessToken: Boolean(tokens.accessToken.value) }, null, 2)}
        </pre>
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1 style={{ color: "crimson" }}>Connection Failed</h1>
        <p>Wix returned an error when attempting to authenticate:</p>
        <pre style={{ background: "#fce8e6", padding: 15, borderRadius: 6, color: "#c5221f" }}>
          {error?.message || "Unknown error occurred"}
        </pre>
      </div>
    );
  }
}