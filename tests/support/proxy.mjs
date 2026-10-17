// A TCP proxy in front of the test server that can be cut, so a browser
// context loses the server the way a phone in a shop does: open connections
// break and new ones fail.

import { connect, createServer } from 'node:net';

export async function startProxy(targetUrl) {
  const target = new URL(targetUrl);
  const sockets = new Set();
  let reachable = true;

  const track = (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => socket.destroy());
  };

  const server = createServer((client) => {
    track(client);
    if (!reachable) {
      client.destroy();
      return;
    }
    const upstream = connect(Number(target.port), target.hostname);
    track(upstream);
    client.on('close', () => upstream.destroy());
    upstream.on('close', () => client.destroy());
    client.pipe(upstream).pipe(client);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  return {
    url: `http://127.0.0.1:${server.address().port}`,
    cut() {
      reachable = false;
      for (const socket of sockets) socket.destroy();
    },
    restore() {
      reachable = true;
    },
    async close() {
      this.cut();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
