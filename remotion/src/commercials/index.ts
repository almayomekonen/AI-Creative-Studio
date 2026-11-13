import type { CommercialSpec } from "../engine/types";
import volt from "./volt.json";
import ether from "./ether.json";
import tempo from "./tempo.json";

/** Registry: every spec here becomes a composition `Ad-<id>`. Add a commercial = add a JSON + one line. */
export const COMMERCIALS = [volt, ether, tempo] as unknown as CommercialSpec[];
