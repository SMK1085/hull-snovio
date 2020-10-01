import { statusActionFactory } from "./status";
import { accountUpdateHandlerFactory } from "./account-update";
import { metaActionFactory } from "./meta";
import { userUpdateHandlerFactory } from "./user-update";

export default {
  status: statusActionFactory,
  accountUpdate: accountUpdateHandlerFactory,
  userUpdate: userUpdateHandlerFactory,
  meta: metaActionFactory,
};
