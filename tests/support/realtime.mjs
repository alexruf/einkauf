// Minimal client for PocketBase's realtime API (Server-Sent Events), read
// with plain fetch so that tests check the raw HTTP contract.

export async function connectRealtime(url) {
  const controller = new AbortController();
  const res = await fetch(`${url}/api/realtime`, { signal: controller.signal });
  if (!res.ok) throw new Error(`Realtime connect failed with ${res.status}`);

  const events = [];
  const waiters = new Set();
  const notify = () => {
    for (const w of waiters) w();
  };

  (async () => {
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let end;
        while ((end = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const event = { name: 'message', data: '' };
          for (const line of raw.split('\n')) {
            if (line.startsWith('event:')) event.name = line.slice(6).trim();
            else if (line.startsWith('data:')) event.data += line.slice(5).trim();
          }
          try {
            event.data = JSON.parse(event.data);
          } catch {
            // Keep non-JSON data as a string.
          }
          events.push(event);
          notify();
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') throw err;
    }
  })();

  // Resolves with the first event matching the predicate, or rejects after
  // the timeout.
  const waitFor = (predicate, timeoutMs = 5000) =>
    new Promise((resolve, reject) => {
      const check = () => {
        const found = events.find(predicate);
        if (found) {
          clearTimeout(timer);
          waiters.delete(check);
          resolve(found);
        }
      };
      const timer = setTimeout(() => {
        waiters.delete(check);
        reject(new Error(`No matching realtime event within ${timeoutMs} ms; got ${JSON.stringify(events)}`));
      }, timeoutMs);
      waiters.add(check);
      check();
    });

  const connect = await waitFor((e) => e.name === 'PB_CONNECT');
  const clientId = connect.data.clientId;

  const subscribe = async (subscriptions, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = token;
    const sub = await fetch(`${url}/api/realtime`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ clientId, subscriptions }),
    });
    if (sub.status !== 204) throw new Error(`Realtime subscribe failed with ${sub.status}: ${await sub.text()}`);
  };

  return { clientId, events, waitFor, subscribe, close: () => controller.abort() };
}
