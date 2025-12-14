export type IncEffect = {
  op: "inc";
  path: string;
  amount: number;
};

export type SetEffect = {
  op: "set";
  path: string;
  value: unknown;
};

export type AddTagEffect = {
  op: "addTag";
  tag: string;
};

export type RemoveTagEffect = {
  op: "removeTag";
  tag: string;
};

export type PushLogEffect = {
  op: "pushLog";
  entry: string;
};

export type MoveLocationEffect = {
  op: "moveLocation";
  zone: string;
  place: string;
};

export type Effect =
  | IncEffect
  | SetEffect
  | AddTagEffect
  | RemoveTagEffect
  | PushLogEffect
  | MoveLocationEffect;
