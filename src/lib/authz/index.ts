/**
 * Authorization layer: RBAC + ownership, deny by default.
 * Usare in tutte le server actions e nelle page per bloccare accessi non autorizzati.
 */

export {
  requireAuth,
  requirePermission,
  requireEntityPermission,
  requireOwnership,
  getAuthzContext,
  withAuthz,
  ForbiddenError,
} from "./guard";
export type { AuthzContext } from "./guard";

export {
  hasModulePermission,
  getModuleForEntity,
} from "./matrix";

export {
  getImpiantoIdsForTecnico,
  impiantiWhereForRole,
  manutenzioneWhereForRole,
  interventoWhereForRole,
  verificaBiennaleWhereForRole,
  presenzaWhereForRole,
  presenzaCantiereWhereForRole,
} from "./filters";

export {
  ROLES,
  PERMISSIONS,
  isTecnico,
  isAdmin,
  isUfficio,
  canBypassOwnership,
} from "./constants";
export type { Role, Permission } from "./constants";
