export const ENV = {
  gameServerUrl: import.meta.env.VITE_GAME_SERVER_URL || 'ws://localhost:2567',
  siteUrl: import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:3000',
  accountUrl: import.meta.env.VITE_PUBLIC_ACCOUNT_URL || 'http://localhost:3000/account',
  defaultPlayerName: import.meta.env.VITE_DEFAULT_PLAYER_NAME || 'Wanderer',
};
