export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Only POST requests are allowed", { status: 405 });
    }

    try {
      // Step 1: Retrieve and decompress the gzipped data
      const compressedData = await request.arrayBuffer();
      const stream = new Response(compressedData).body;
      const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
      const decompressedText = await new Response(decompressedStream).text();

      // Step 2: Parse the decompressed text as JSON, handling newline-separated JSON objects
      const logEntries = decompressedText
        .trim()
        .split("\n")
        .map(line => JSON.parse(line));

      // Step 3: Separate unique IPs and hostnames with HTTPStatusCode 526
      const uniqueIps = new Set();
      const uniqueHosts = new Set();
      
      const ipPattern = /^(?:\d{1,3}\.){3}\d{1,3}$/; // Basic regex pattern for IPv4 addresses

      logEntries.forEach(entry => {
        if (entry.HTTPStatusCode === 526 && entry.HTTPHost) {
          if (ipPattern.test(entry.HTTPHost)) {
            uniqueIps.add(entry.HTTPHost);
          } else {
            uniqueHosts.add(entry.HTTPHost);
          }
        }
      });

      // Convert Sets to arrays and format them for API requests
      const ipsToAppend = Array.from(uniqueIps).map(ip => ({ value: ip }));
      const hostsToAppend = Array.from(uniqueHosts).map(host => ({ value: host }));

      // Step 4: Send PATCH requests to update both lists, if there are entries to append
      if (ipsToAppend.length > 0) {
        await updateList(env, env.IPS_LIST_ID, ipsToAppend, "IP addresses");
      }
      if (hostsToAppend.length > 0) {
        await updateList(env, env.HOSTS_LIST_ID, hostsToAppend, "Hostnames");
      }

      return new Response("Processed log data and updated lists", { status: 200 });

    } catch (error) {
      console.error("Error processing request:", error);
      return new Response("Error processing request", { status: 500 });
    }
  }
};

// Helper function to send PATCH request to the specified list ID
async function updateList(env, listId, items, listType) {
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/gateway/lists/${listId}`;
  const response = await fetch(apiUrl, {
    method: 'PATCH',
    headers: {
      'X-Auth-Email': env.EMAIL,
      'X-Auth-Key': env.API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ append: items })
  });

  if (!response.ok) {
    console.error(`Failed to append ${listType} to list ID ${listId}: ${response.statusText}`);
    items.forEach(item => console.error(`Could not update item: ${item.value}`));
  }
}
