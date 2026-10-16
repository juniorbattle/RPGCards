# Matrice QA : règlement V3.0 + avenant V3.2

**Exigence :** reproduire avec fixtures stables, seed gameplay explicite, états public/privé et assert des zones + logs. Les tests historiques `simulator_ref/simulator/test/engine.test.mjs` sont des exemples ; on ne se contente pas de les copier.

| ID | Entrée | Sortie attendue |
|---|---|---|
| G01 | Basic rangs I-IV | Puissances 3/6/9/12 ; Rang ≠ Puissance |
| G02 | deck standard | 16 identités ordinaires une chacune + 1 Signature, aucune duplication de carte physique |
| G03 | Secondaire posée T | ni reveal volontaire ni utilisation T ; utilisable seulement T+1 après reveal |
| G04 | Secondary cachée inactive | n'apporte aucun effet ni action, reste dos adverse |
| G05 | support Rang même famille | `rang+1` par support survivant, deux soutiens donnent chacun le bonus |
| G06 | support Rang famille différente | bonus `rang` sans +1 ; la Garde gagne l'égalité |
| G07 | Interférence ciblant support même famille | compare **Rangs imprimés**, jamais leur bonus d'affinité |
| G08 | Assaut Cendre III P9 + Cendre I Rang vs Garde Cendre IV P12 | score 5 contre 4 ; l'Assaut gagne au Rang, dommage = 0 |
| G09 | même sans support | Garde IV gagne ; dommage = 0 |
| G10 | deux soutiens dégâts ×5+×4, Signature P14 contre Garde IV P12 | M=9, dégâts (14−12)×9 =18 ; contre Assaut inférieur 126 |
| G11 | Assaut/Assaut rang égal | dégâts simultanés ; aucun vainqueur pour effet conditionné à « gagne » |
| G12 | Signature ∞ vs normale au Rang renforcé | ∞ domine, mais Garde ordinaire absorbe selon P |
| G13 | Signature ∞ Assaut/∞ Garde | Garde gagne, 0 dégât ; ∞ Assaut/∞ Assaut échange dégâts |
| G14 | Interférer contre support Conserver | cible reste active, interférente est consommée sans gain de réussite |
| G15 | Interférences mutuelles valides | annulation en passe unique sans récursion, deux consommées |
| G16 | Insight + Technique | réserve max 2 ; gain max +1/tour ; 1 Technique/tour ; 2 équipées ; pas de financement futur |
| G17 | Technique Lecture double | voient modes initiaux, changements simultanés cachés avant commit |
| G18 | Ancrage utilisé et ciblé | action annulée, Secondary préservée ; sans Interférence la Secondaire est consommée |
| G19 | Rupture/Garde sans cible | coût payé, pas d'action rétroactive |
| G20 | Voile Silence/ Miroir | pas d'annulation rétroactive de la révélation d'information |
| G21 | Brasier Orig., Couronne Ronce, Convergence Astrale | conditions exactes et destinations des soutiens, au plus un Repoussement |
| G22 | Contrecoup + impacts | dommage fixe non amplifiable, simultané ; double KO → 1 PV chacun |
| G23 | Retour pioche / Repoussement / main >4 | zone unique ; sous/sommet ; excédent régulé début tour suivant |
| G24 | journal T2 et camouflage Voile | affiche tous les scores et absorption sans divulguer carte masquée |
| G25 | AI observation | ne voit ni la main adverse, ni l'engagement tactique non dévoilé, ni l'effet d'information privé |
| G26 | transition et animation accélérée | PV et état finaux identiques avec animation longue, réduite et sautée |
| G27 | parcours 20+ seeds variées | aucune mutation impossible ni boucle bloquante d'états ordinaires |
| G28 | tests réels UI | clic, glisser-déposer, mobile/tactile, clavier, sélection de cibles, annulation précommit |

**Ajouter les scénarios de l'annexe §16.4 V3.0**, même s'ils semblent recouvrir ceux-ci. Tout cas ambigu doit posséder une fixture de reproduction avant d'être déclaré « conforme ».
