import { shopApi, type ShopInventory } from "./shop";

/** Alias of `ShopInventory` (mirrors `UserInventoryResponse`); defined once in `shop.ts`. */
export type UserInventory = ShopInventory;

export const inventoryApi = {
  getMyInventory: shopApi.getMyInventory,
};
