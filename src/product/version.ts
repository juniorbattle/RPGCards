/**
 * Version du jeu inscrite dans chaque sauvegarde (diagnostic, migrations). Seule source : `package.json` (fiche de clôture,
 * E1 : 0.18.0 au lot de correction, 1.0.0 à la version finale) ; seul le champ `version` entre dans le build.
 */
import { version } from '../../package.json';

export const GAME_VERSION: string = version;
