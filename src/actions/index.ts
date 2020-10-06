import { statusActionFactory } from "./status";
import { accountUpdateHandlerFactory } from "./account-update";
import { metaActionFactory } from "./meta";
import { userUpdateHandlerFactory } from "./user-update";
import { fetchActionFactory } from "./fetch";

export default {
  status: statusActionFactory,
  accountUpdate: accountUpdateHandlerFactory,
  userUpdate: userUpdateHandlerFactory,
  meta: metaActionFactory,
  fetch: fetchActionFactory,
};
