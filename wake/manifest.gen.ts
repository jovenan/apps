// DO NOT EDIT. This file is generated by deco.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $$$0 from "./loaders/productList.ts";
import * as $$$1 from "./loaders/productDetailsPage.ts";
import * as $$$2 from "./loaders/productListingPage.ts";
import * as $$$3 from "./loaders/proxy.ts";
import * as $$$4 from "./loaders/cart.ts";
import * as $$$$$$$$$0 from "./actions/cart/addCoupon.ts";
import * as $$$$$$$$$1 from "./actions/cart/addItem.ts";
import * as $$$$$$$$$2 from "./actions/cart/updateItemQuantity.ts";
import * as $$$$$$$$$3 from "./actions/cart/removeCoupon.ts";

const manifest = {
  "loaders": {
    "wake/loaders/cart.ts": $$$4,
    "wake/loaders/productDetailsPage.ts": $$$1,
    "wake/loaders/productList.ts": $$$0,
    "wake/loaders/productListingPage.ts": $$$2,
    "wake/loaders/proxy.ts": $$$3,
  },
  "actions": {
    "wake/actions/cart/addCoupon.ts": $$$$$$$$$0,
    "wake/actions/cart/addItem.ts": $$$$$$$$$1,
    "wake/actions/cart/removeCoupon.ts": $$$$$$$$$3,
    "wake/actions/cart/updateItemQuantity.ts": $$$$$$$$$2,
  },
  "name": "wake",
  "baseUrl": import.meta.url,
};

export type Manifest = typeof manifest;

export default manifest;
