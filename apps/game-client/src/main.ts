import { GameApp } from './game/GameApp';

let game: GameApp | null = null;

async function init(): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('[Main] Could not find game canvas element');
    return;
  }

  game = new GameApp(canvas);
  await game.start();
}

window.addEventListener('unload', () => {
  if (game) {
    game.dispose();
    game = null;
  }
});

init().catch((err) => {
  console.error('[Main] Failed to initialize game:', err);
});
