console.log('[Boot] Starting...');

async function boot() {
  console.log('[Boot] Importing GameApp...');
  const { GameApp } = await import('./game/GameApp');
  console.log('[Boot] GameApp loaded');

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) { console.error('[Boot] No canvas'); return; }

  // Dispose any prior game instance — protects against Vite HMR holding the WebGL context
  const prior = (window as any).__game;
  if (prior && typeof prior.dispose === 'function') {
    try {
      prior.dispose();
      console.log('[Boot] Disposed prior GameApp');
    } catch (err) {
      console.warn('[Boot] Prior dispose failed:', err);
    }
    (window as any).__game = null;
  }

  const game = new GameApp(canvas);
  await game.start();
  (window as any).__game = game;
  (window as any).__scene = game.getScene?.();
  console.log('[Boot] Game running');

  window.addEventListener('pagehide', () => game.dispose());

  // Vite HMR cleanup — dispose before the module is replaced
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      try {
        game.dispose();
      } catch { /* ignore */ }
      (window as any).__game = null;
    });
  }
}

boot().catch((err) => {
  console.error('[Boot] FATAL:', err);
  document.body.innerHTML = `<pre style="color:red;padding:20px">${err.stack || err}</pre>`;
});
