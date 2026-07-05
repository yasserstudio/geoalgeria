// Type definitions for @geoalgeria/pharma — umbrella meta-package.
import type industrie from "@geoalgeria/industrie-pharmaceutique";
import type pharmacies from "@geoalgeria/pharmacies";

export { industrie, pharmacies };

declare const _default: {
  industrie: typeof industrie;
  pharmacies: typeof pharmacies;
};
export default _default;
