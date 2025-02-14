import { AppContext } from "../../mod.ts";
import type { SimulationOrderForm } from "../../utils/types.ts";

export interface Item {
  id: number;
  quantity: number;
  seller: string;
}

export interface Props {
  items: Item[];
  postalCode: string;
  country: string;
}

/**
 * @docs https://developers.vtex.com/docs/api-reference/checkout-api#post-/api/checkout/pub/orderForms/simulation
 */
const action = async (
  props: Props,
  _req: Request,
  ctx: AppContext,
): Promise<SimulationOrderForm> => {
  const { vcs } = ctx;
  const {
    items,
    postalCode,
    country,
  } = props;

  const response = await vcs["POST /api/checkout/pub/orderForms/simulation"](
    {},
    {
      body: { items, postalCode, country },
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
    },
  );

  return response.json();
};

export default action;
