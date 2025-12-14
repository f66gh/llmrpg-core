export type Item = {
  id: string;
  name: string;
  description?: string;
};

export type Player = {
  id: string;
  name: string;
  hp: number;
  mp: number;
  inventory: Item[];
};

export type GameState = {
  player: Player;
  worldId: string;
  log: string[];
};
