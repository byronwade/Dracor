export const DRACOR_HOSTS = {
  main: 'thedracor.com',
  play: 'play.thedracor.com',
  account: 'account.thedracor.com',
  dev: 'dev.thedracor.com',
  gameClient: 'game.thedracor.com',
  gameServer: 'server.thedracor.com',
};

export function getPublicUrls() {
  return {
    site: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    play: process.env.NEXT_PUBLIC_PLAY_URL || 'http://localhost:3000/play',
    account: process.env.NEXT_PUBLIC_ACCOUNT_URL || 'http://localhost:3000/account',
    dev: process.env.NEXT_PUBLIC_DEV_URL || 'http://localhost:3000/dev',
    gameClient: process.env.NEXT_PUBLIC_GAME_CLIENT_URL || 'http://localhost:5173',
    gameServer: process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'ws://localhost:2567',
  };
}
