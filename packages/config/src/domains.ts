export interface DracorDomainConfig {
  site: string;
  play: string;
  account: string;
  dev: string;
  gameClient: string;
  gameServer: string;
}

export const PRODUCTION_DRACOR_URLS: DracorDomainConfig = {
  site: 'https://thedracor.com',
  play: 'https://play.thedracor.com',
  account: 'https://account.thedracor.com',
  dev: 'https://dev.thedracor.com',
  gameClient: 'https://game.thedracor.com',
  gameServer: 'wss://server.thedracor.com',
};

export const LOCAL_DRACOR_URLS: DracorDomainConfig = {
  site: 'http://localhost:3000',
  play: 'http://localhost:3000/play',
  account: 'http://localhost:3000/account',
  dev: 'http://localhost:3000/dev',
  gameClient: 'http://localhost:5173',
  gameServer: 'ws://localhost:2567',
};

export const DRACOR_HOSTS = {
  main: 'thedracor.com',
  play: 'play.thedracor.com',
  account: 'account.thedracor.com',
  dev: 'dev.thedracor.com',
  gameClient: 'game.thedracor.com',
  gameServer: 'server.thedracor.com',
} as const;

export function getPublicUrls(): DracorDomainConfig {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SITE_URL) {
    return {
      site: process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_DRACOR_URLS.site,
      play: process.env.NEXT_PUBLIC_PLAY_URL || PRODUCTION_DRACOR_URLS.play,
      account: process.env.NEXT_PUBLIC_ACCOUNT_URL || PRODUCTION_DRACOR_URLS.account,
      dev: process.env.NEXT_PUBLIC_DEV_URL || PRODUCTION_DRACOR_URLS.dev,
      gameClient: process.env.NEXT_PUBLIC_GAME_CLIENT_URL || PRODUCTION_DRACOR_URLS.gameClient,
      gameServer: process.env.NEXT_PUBLIC_GAME_SERVER_URL || PRODUCTION_DRACOR_URLS.gameServer,
    };
  }
  return LOCAL_DRACOR_URLS;
}
