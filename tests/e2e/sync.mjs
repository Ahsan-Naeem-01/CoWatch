// Two-browser end-to-end sync test.
// Drives Chromium with two independent BrowserContexts (= two "users").
// One creates a room, one joins, both load video1.mp4, then we verify
// that host play/pause are mirrored on the peer's <video> element.

import { chromium } from 'playwright';

const FRONTEND = process.env.FRONTEND || 'http://localhost:5199';
const VIDEO = 'C:/Users/ahsan/Downloads/Video/video1.mp4';
const ROOM = `e2e-${Date.now()}`;
const PASSWORD = 'pw';

const ok = (msg) => console.log(`  ✔ ${msg}`);
const info = (msg) => console.log(`  · ${msg}`);
const fail = (msg) => {
  console.error(`  ✘ ${msg}`);
  process.exitCode = 1;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function videoState(page) {
  return page.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return null;
    return {
      paused: v.paused,
      currentTime: v.currentTime,
      muted: v.muted,
      readyState: v.readyState,
      duration: v.duration,
    };
  });
}

async function waitForVideoReady(page, label) {
  await page.waitForSelector('video', { timeout: 20_000 });
  await page.waitForFunction(
    () => {
      const v = document.querySelector('video');
      return v && v.readyState >= 2 && v.duration > 0;
    },
    { timeout: 20_000 }
  );
  info(`${label}: video ready (HAVE_CURRENT_DATA)`);
}

(async () => {
  console.log('CoWatch e2e — two-browser play/pause sync test\n');

  const browser = await chromium.launch({ headless: true });
  const ctxHost = await browser.newContext({ permissions: [] });
  const ctxPeer = await browser.newContext({ permissions: [] });
  const host = await ctxHost.newPage();
  const peer = await ctxPeer.newPage();

  const forward = (label) => (m) => {
    const t = m.text();
    if (t.includes('cowatch') || m.type() === 'error' || m.type() === 'warning') {
      console.log(`[${label}:${m.type()}]`, t);
    }
  };
  host.on('console', forward('host'));
  peer.on('console', forward('peer'));
  host.on('pageerror', (e) => console.log('[host:pageerror]', e.message));
  peer.on('pageerror', (e) => console.log('[peer:pageerror]', e.message));

  try {
    info(`Loading ${FRONTEND} in both browsers`);
    await Promise.all([host.goto(FRONTEND), peer.goto(FRONTEND)]);
    await Promise.all([host.waitForSelector('#roomName'), peer.waitForSelector('#roomName')]);

    // Host: fill the form (create mode is default) and submit.
    await host.fill('#displayName', 'Host');
    await host.fill('#roomName', ROOM);
    await host.fill('#password', PASSWORD);
    await host.locator('button[type="submit"]').click();
    await host.waitForURL(/\/room\//, { timeout: 10_000 });
    ok('Host created room and entered room page');

    // Peer: switch to "Join an existing room", fill, submit.
    await peer.locator('button:has-text("Join an existing room")').click();
    await peer.fill('#displayName', 'Peer');
    await peer.fill('#roomName', ROOM);
    await peer.fill('#password', PASSWORD);
    await peer.locator('button[type="submit"]').click();
    await peer.waitForURL(/\/room\//, { timeout: 10_000 });
    ok('Peer joined the same room');

    // Both load the same local video file via the hidden file input.
    info('Loading video file on both browsers (hashing may take a few seconds)');
    await Promise.all([
      host.locator('input[type="file"]').first().setInputFiles(VIDEO),
      peer.locator('input[type="file"]').first().setInputFiles(VIDEO),
    ]);

    await waitForVideoReady(host, 'host');
    await waitForVideoReady(peer, 'peer');

    // Give the file-hash exchange + initial snapshot a moment to settle.
    await sleep(800);


    // ----- Test 1: host plays → peer plays -----
    info('Host clicks play');
    // Click play through the JS API to avoid relying on hover-revealed controls.
    await host.evaluate(() => {
      const v = document.querySelector('video');
      v.play();
    });

    // Poll until peer's video reports !paused, up to 4s.
    const peerStartedPlaying = await peer.waitForFunction(
      () => {
        const v = document.querySelector('video');
        return v && !v.paused;
      },
      { timeout: 5_000 }
    ).then(() => true).catch(() => false);

    const peerAfterPlay = await videoState(peer);
    if (peerStartedPlaying) ok(`Peer video is playing (currentTime=${peerAfterPlay.currentTime.toFixed(2)}s, muted=${peerAfterPlay.muted})`);
    else fail(`Peer video is still paused after host pressed play: ${JSON.stringify(peerAfterPlay)}`);

    // Confirm peer's currentTime is actually advancing (not just unfrozen briefly).
    const t1 = (await videoState(peer)).currentTime;
    await sleep(1500);
    const t2 = (await videoState(peer)).currentTime;
    const delta = t2 - t1;
    if (delta > 0.5) ok(`Peer currentTime advanced by ${delta.toFixed(2)}s in 1.5s`);
    else fail(`Peer currentTime did not advance (Δ=${delta.toFixed(3)}s)`);

    // ----- Test 2: host pauses → peer pauses -----
    info('Host clicks pause');
    await host.evaluate(() => {
      const v = document.querySelector('video');
      v.pause();
    });

    const peerPaused = await peer.waitForFunction(
      () => {
        const v = document.querySelector('video');
        return v && v.paused;
      },
      { timeout: 3_000 }
    ).then(() => true).catch(() => false);

    const peerAfterPause = await videoState(peer);
    if (peerPaused) ok(`Peer video paused (currentTime=${peerAfterPause.currentTime.toFixed(2)}s)`);
    else fail(`Peer video did NOT pause: ${JSON.stringify(peerAfterPause)}`);

    // Confirm currentTime is now stable (not advancing).
    const ta = (await videoState(peer)).currentTime;
    await sleep(1200);
    const tb = (await videoState(peer)).currentTime;
    if (Math.abs(tb - ta) < 0.2) ok(`Peer currentTime is stable while paused (Δ=${(tb - ta).toFixed(3)}s)`);
    else fail(`Peer currentTime kept advancing while paused: ${ta.toFixed(2)} -> ${tb.toFixed(2)}`);

    // ----- Test 3: play again after pause -----
    info('Host plays again');
    await host.evaluate(() => document.querySelector('video').play());
    const peerResumed = await peer.waitForFunction(
      () => !document.querySelector('video').paused,
      { timeout: 3_000 }
    ).then(() => true).catch(() => false);
    if (peerResumed) ok('Peer resumes playing on the second host-play');
    else fail('Peer did NOT resume on host-play #2');

    // ----- Test 4: seek -----
    info('Host seeks to 30s');
    await host.evaluate(() => {
      const v = document.querySelector('video');
      v.currentTime = 30;
    });
    const peerSeeked = await peer.waitForFunction(
      () => {
        const v = document.querySelector('video');
        return v && Math.abs(v.currentTime - 30) < 2;
      },
      { timeout: 4_000 }
    ).then(() => true).catch(() => false);
    const peerSeekState = await videoState(peer);
    if (peerSeeked) ok(`Peer seeked to ~${peerSeekState.currentTime.toFixed(2)}s`);
    else fail(`Peer did not seek: at ${peerSeekState.currentTime.toFixed(2)}s`);
  } catch (err) {
    fail(`Unhandled error: ${err.message}`);
    console.error(err);
  } finally {
    await browser.close();
  }

  console.log(process.exitCode ? '\nFAILED' : '\nPASSED');
})();
