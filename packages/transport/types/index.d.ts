// Type definitions for @geoalgeria/transport — umbrella meta-package.
import type aviation from "@geoalgeria/aviation";
import type ferroviaire from "@geoalgeria/ferroviaire";
import type garesRoutieres from "@geoalgeria/gares-routieres";
import type buses from "@geoalgeria/buses";

export { aviation, ferroviaire, garesRoutieres, buses };

declare const _default: {
  aviation: typeof aviation;
  ferroviaire: typeof ferroviaire;
  garesRoutieres: typeof garesRoutieres;
  buses: typeof buses;
};
export default _default;
