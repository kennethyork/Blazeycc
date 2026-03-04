/**
 * Gumroad to GitHub Actions Webhook Relay
 * 
 * Deploy this to Cloudflare Workers (free tier)
 * This receives Gumroad "ping" webhooks and triggers GitHub Actions
 * 
 * Setup:
 * 1. Go to dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this code
 * 3. Add environment variables:
 *    - GITHUB_TOKEN: Your GitHub personal access token (needs repo scope)
 *    - GITHUB_OWNER: blazeycc
 *    - GITHUB_REPO: Blazeycc
 *    - GUMROAD_SECRET: (optional) Your Gumroad ping secret for verification
 * 4. Deploy and copy the worker URL
 * 5. Go to Gumroad → Settings → Ping → Add your worker URL
 */

export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Parse the form data from Gumroad
      const formData = await request.formData();
      
      // Extract relevant fields
      const email = formData.get('email');
      const fullName = formData.get('full_name') || 'Customer';
      const productName = formData.get('product_name');
      const saleId = formData.get('sale_id');
      const sellerEmail = formData.get('seller_email');
      const purchaserId = formData.get('purchaser_id');
      const price = formData.get('price');
      
      // Verify this is a real sale (not a refund or dispute)
      const refunded = formData.get('refunded') === 'true';
      const disputed = formData.get('disputed') === 'true';
      const chargebacked = formData.get('chargebacked') === 'true';
      
      if (refunded || disputed || chargebacked) {
        return new Response('Skipping: sale was refunded/disputed', { status: 200 });
      }
      
      // Optionally verify the ping with Gumroad secret
      if (env.GUMROAD_SECRET) {
        // Gumroad doesn't send a signature, but you can check if the seller_email matches
        // Or implement your own verification logic
      }

      // Trigger GitHub Actions via repository_dispatch
      const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'GumroadWebhookRelay/1.0'
          },
          body: JSON.stringify({
            event_type: 'gumroad_sale',
            client_payload: {
              email: email,
              full_name: fullName,
              product_name: productName,
              sale_id: saleId,
              purchaser_id: purchaserId,
              price: price,
              timestamp: new Date().toISOString()
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('GitHub API error:', error);
        return new Response(`GitHub API error: ${response.status}`, { status: 500 });
      }

      console.log(`✅ License triggered for ${email} (Sale: ${saleId})`);
      return new Response('OK - License workflow triggered', { status: 200 });

    } catch (error) {
      console.error('Error:', error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};
