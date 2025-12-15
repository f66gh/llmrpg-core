import type { EventDef } from "@llmrpg/core";
import { debtNotice } from "./debtNotice";
import { foundCoin } from "./foundCoin";
import { midnightSettlement } from "./midnightSettlement";
import { quietMorning } from "./quietMorning";
import { streetChatter } from "./streetChatter";

export const sandboxEvents: EventDef[] = [
  quietMorning,
  streetChatter,
  debtNotice,
  foundCoin,
  midnightSettlement
];

export default sandboxEvents;
