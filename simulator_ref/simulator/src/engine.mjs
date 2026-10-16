// Les Quatre Voies — Moteur expérimental V3.0, sans dépendance visuelle.
export const FAMILIES=['Cendre','Voile','Ronce','Astre'];
export const SYMBOL={Cendre:'◆',Voile:'◈',Ronce:'✿',Astre:'✦'};
export const POWER={1:3,2:6,3:9,4:12};
export const ROMAN={1:'I',2:'II',3:'III',4:'IV'};
export const VARIANTS={Cendre:{1:['Étincelle','Uncommon'],2:['Braise','Uncommon'],3:['Ferveur','Rare'],4:['Contrecoup','Epic']},Voile:{1:['Éclaireur','Uncommon'],2:['Détour','Rare'],3:['Dissimulation','Epic'],4:['Silence','Legendary']},Ronce:{1:['Racine','Uncommon'],2:['Écaille','Rare'],3:['Entrave','Rare'],4:['Ténacité','Epic']},Astre:{1:['Repère','Uncommon'],2:['Prisme','Rare'],3:['Relance','Epic'],4:['Convergence','Legendary']}};
export const SIGNATURES={Cendre:{name:'Brasier Originel',power:14,effect:'Flamme conquérante'},Voile:{name:'Miroir du Voile',power:12,effect:'Clairvoyance voilée'},Ronce:{name:'Couronne de Ronce',power:12,effect:'Emprise'},Astre:{name:'Convergence Astrale',power:13,effect:'Cycle astral'}};
export const TECH_COST={Sondage:1,Recentrage:1,Lecture:2,Ancrage:1,Rupture:2,Dissipation:1};
export const EFFECT_TEXT={
 'Étincelle':'Rang d’un Assaut gagnant de 1 point et blessant : +2 dégâts fixes.',
 'Braise':'Primaire Assaut gagnant contre Assaut sans soutien Dégâts : +2 dégâts fixes.',
 'Ferveur':'Soutien Dégâts : Primaire Cendre victorieuse et blessante → +1 Insight.',
 'Contrecoup':'Primaire Assaut perdant contre Assaut : inflige 3 dégâts fixes.',
 'Éclaireur':'À la révélation en Secondaire : observe une carte aléatoire de main adverse.',
 'Détour':'Interférence réussie non annulée : observe une carte aléatoire adverse.',
 'Dissimulation':'À la révélation : masque l’autre Secondaire active jusqu’à fin de tour.',
 'Silence':'Interférence non annulée contre Secondaire IV engagée : neutralise effet de Primaire en attente.',
 'Racine':'Soutien Rang Garde gagnante : identifie une Secondaire cachée repoussée.',
 'Écaille':'Soutien Rang Garde gagnante : soigne 2 PV après le Clash.',
 'Entrave':'Primaire Garde : envoie une Secondaire cachée repoussée sous la pioche.',
 'Ténacité':'Soutien Rang Garde perdante : retour au-dessous de sa pioche.',
 'Repère':'À la révélation : observe le sommet de sa propre pioche.',
 'Prisme':'Soutien Dégâts : +1 d’affinité même avec une autre famille.',
 'Relance':'Interférence non annulée contre rang III : retour au sommet de pioche.',
 'Convergence':'Soutien Dégâts vers autre famille : coefficient ×6.',
 'Flamme conquérante':'Assaut gagnant et blessant avec soutien Dégâts : repousse une Secondaire cachée.',
 'Clairvoyance voilée':'À révélation : voit une carte de main adverse et la plus ancienne Secondaire cachée.',
 'Emprise':'Garde gagnante : repousse une Secondaire adverse encore en jeu, cachée ou active.',
 'Cycle astral':'Victoire avec exactement un soutien Dégâts ou Interférence valide : retour du soutien en sommet de pioche.'
};
export function makeDeck(family='Cendre',variants=true) {
 const cards=[];
 for(const f of FAMILIES)for(let rank=1;rank<=4;rank++){
  const [effect,rarity]=VARIANTS[f][rank];cards.push({id:`${f}-${rank}`,name:`${f} ${ROMAN[rank]}`,family:f,rank,power:POWER[rank],signature:false,effect:variants?effect:null,rarity:variants?rarity:'Basic'});
 }
 const sig=SIGNATURES[family];cards.push({id:`signature-${family}`,name:sig.name,family,rank:Infinity,power:sig.power,signature:true,effect:sig.effect,rarity:'Signature'});return cards;
}
export function rngFromSeed(seed=2026) {let state=(Number(seed)>>>0)||1;return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};}
export function shuffle(a,rng){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function randomOf(list,rng){return list.length?list[Math.floor(rng()*list.length)]:null;}
const who=i=>i===0?'Vous':'Rival';
function log(g,msg,privateTo=null){g.log.push({turn:g.turn,msg,privateTo});if(g.log.length>450)g.log.shift();}
function cardText(c){return c?`${c.name}${c.effect?' · '+c.effect:''}`:'—';}
export function makeGame(opts={}){
 const rng=rngFromSeed(opts.seed??20261015);
 const players=[0,1].map(i=>({name:i?'Rival':'Vous',hp:Math.max(1,Number(opts[i?'enemyHp':'heroHp']||90)),maxHp:Math.max(1,Number(opts[i?'enemyHp':'heroHp']||90)),insight:1,gained:0,techUsed:false,techs:i?(opts.enemyTechs||['Ancrage','Dissipation']):(opts.techs||['Lecture','Ancrage']),deck:shuffle(makeDeck(i?(opts.enemySignature||'Ronce'):(opts.heroSignature||'Cendre'),i?opts.enemyVariants!==false:opts.heroVariants!==false),rng),hand:[],discard:[],secondary:[null,null],primary:null,stance:null,pending:null,masked:new Set(),info:[]}));
 const g={turn:0,phase:'init',players,log:[],rng,seed:opts.seed??20261015,winner:null,extension:0,pendingRepels:[],lastResult:null,aiPlan:null};
 startTurn(g);return g;
}
function putIn(g,p,card,destination='discard'){
 if(destination==='top')p.deck.push(card);else if(destination==='bottom')p.deck.unshift(card);else if(destination==='hand')p.hand.push(card);else p.discard.push(card);
}
export function draw(g,i,n=1){const p=g.players[i];let drawn=0;for(let j=0;j<n;j++){if(!p.deck.length){if(!p.discard.length)break;p.deck=shuffle(p.discard,g.rng);p.discard=[];log(g,`${who(i)} mélange sa défausse dans la pioche.`);}p.hand.push(p.deck.pop());drawn++;}return drawn;}
export function startTurn(g){g.turn++;g.phase='prepare';g.pendingRepels=[];g.lastResult=null;for(let i=0;i<2;i++){
 const p=g.players[i];p.gained=0;p.techUsed=false;p.lastTechnique=null;p.primary=null;p.stance=null;p.pending=null;p.masked=new Set();
 if(p.hand.length>4){if(i===1){while(p.hand.length>4){const c=p.hand.splice(Math.floor(g.rng()*p.hand.length),1)[0];p.discard.push(c);}}else {g.phase='trim';}}
 if(i===1||p.hand.length<=4)draw(g,i,Math.max(0,4-p.hand.length));
 }log(g,`— TOUR ${g.turn} · Préparation —`);check(g);}
export function trimHand(g,indices){if(g.phase!=='trim')throw Error('Pas de régulation en cours');const p=g.players[0];const excess=p.hand.length-4;if(indices.length!==excess||new Set(indices).size!==excess)throw Error(`Choisissez exactement ${excess} cartes à défausser.`);for(const idx of [...indices].sort((a,b)=>b-a)){const c=p.hand.splice(idx,1)[0];if(!c)throw Error('Index de main invalide');p.discard.push(c);}draw(g,0,Math.max(0,4-p.hand.length));g.phase='prepare';check(g);}
export function useTech(g,i,name,option={}){
 const p=g.players[i];if(!p.techs.includes(name)||p.techUsed||p.insight<TECH_COST[name])return false;
 if((name==='Sondage'||name==='Recentrage')&&g.phase!=='prepare')return false;
 if(name==='Dissipation'&&g.phase!=='dissipation')return false;
 if((name==='Ancrage'||name==='Rupture')&&g.phase!=='tactics')return false;
 if(name==='Lecture'&&g.phase!=='lecture')return false;
 if(name==='Recentrage'&&!(option.handIndex>=0&&option.handIndex<p.hand.length))return false;
 if(name==='Dissipation'&&!g.players[1-i].masked.size)return false;
 if(name==='Ancrage'&&!(option.slot===0||option.slot===1))return false;
 if(name==='Rupture'&&!(option.slot===0||option.slot===1))return false;
 p.insight-=TECH_COST[name];p.techUsed=true;p.lastTechnique=name;log(g,`${who(i)} utilise ${name} (−${TECH_COST[name]} Insight).`);
 if(name==='Sondage'){const c=randomOf(g.players[1-i].hand,g.rng);log(g,c?`Sondage : ${cardText(c)}.`:'Sondage : main vide.',i);}
 if(name==='Recentrage'){const c=p.hand.splice(option.handIndex,1)[0];p.deck.unshift(c);draw(g,i,1);log(g,`Recentrage : une carte placée sous la pioche.`,i);}
 if(name==='Dissipation'){const op=g.players[1-i];op.masked.clear();log(g,'Dissipation neutralise le camouflage de préparation adverse.');}
 if(name==='Ancrage'||name==='Rupture')p.techPlan={name,slot:option.slot};
 return true;
}
export function eligibleReveal(g,i){return g.players[i].secondary.map((s,idx)=>s&&!s.active&&s.placedTurn<g.turn?idx:null).filter(x=>x!==null);}
function revealEffects(g,i,revealed){const p=g.players[i];for(const slot of revealed){const s=p.secondary[slot];if(!s?.card.effect)continue;
 const e=s.card.effect;if(e==='Éclaireur'){const c=randomOf(g.players[1-i].hand,g.rng);log(g,c?`Éclaireur observe ${cardText(c)}.`:'Éclaireur : main adverse vide.',i);log(g,'Éclaireur se déclenche.',1-i);}
 if(e==='Repère'){const c=p.deck[p.deck.length-1];log(g,c?`Repère observe le sommet : ${cardText(c)}.`:'Repère : pioche vide.',i);}
 if(e==='Dissimulation'){const other=1-slot,tar=p.secondary[other];if(tar?.active){p.masked.add(other);log(g,`${who(i)} active Dissimulation : l'autre Secondaire est masquée.`);}}
 }}
export function revealPreparation(g,revealHero=[]){if(g.phase!=='prepare')throw Error('Phase invalide');const reveals=[revealHero,chooseAIReveals(g)];for(let i=0;i<2;i++)for(const idx of reveals[i]){const s=g.players[i].secondary[idx];if(!s||s.active||s.placedTurn>=g.turn)throw Error('Révélation impossible');s.active=true;}
 for(let i=0;i<2;i++)revealEffects(g,i,reveals[i]);
 // Toutes les révélations et Dissimulation sont établies AVANT d'écrire le journal
 // public : une Secondaire masquée dès sa révélation ne fuit pas son identité.
 for(let i=0;i<2;i++)for(const slot of reveals[i]){
  const c=g.players[i].secondary[slot].card;
  if(g.players[i].masked.has(slot)){
   log(g,`${i===0?'Vous révélez':'Le rival révèle'} la Secondaire de la case ${slot+1} ; identité masquée par un effet.`);
   log(g,`Votre Secondaire révélée en case ${slot+1} : ${cardText(c)}.`,i);
  }else log(g,`${i===0?'Vous révélez et activez':'Le rival révèle et active'} ${c.name} en Secondaire (case ${slot+1}).`);
 }
 g.phase='dissipation';check(g);}
export function finishDissipation(g,slot=null){if(g.phase!=='dissipation')throw Error('Phase invalide');if(slot!==null)useTech(g,0,'Dissipation',{slot});const enemy=g.players[1];if(enemy.techs.includes('Dissipation')&&!enemy.techUsed&&enemy.insight>=1&&g.players[0].masked.size&&g.rng()<0.65)useTech(g,1,'Dissipation',{slot:0});g.phase='commit';}
function discardReplace(g,i,slot){const p=g.players[i];if(p.secondary[slot]){const c=p.secondary[slot].card;p.secondary[slot]=null;p.discard.push(c);p.masked.delete(slot);log(g,`${who(i)} remplace une Secondaire (${c.name}) : elle rejoint la défausse publique.`);}}
export function commit(g,i,primaryId,stance,secondaryId=null,replaceSlot=null){if(g.phase!=='commit')throw Error('Phase invalide');const p=g.players[i];if(p.pending)throw Error('Déjà engagé');const selected=p.hand.find(c=>c.id===primaryId);if(!selected||!['assault','guard'].includes(stance))throw Error('Primaire ou posture invalide');if(secondaryId===primaryId)throw Error('Les cartes doivent être distinctes');const secondary=secondaryId?p.hand.find(c=>c.id===secondaryId):null;if(secondaryId&&(!secondary||secondary.signature))throw Error('Seconde carte invalide');let dest=-1;if(secondary){dest=p.secondary.findIndex(x=>!x);if(dest<0){if(![0,1].includes(replaceSlot))throw Error('Sélectionnez la Secondaire à remplacer');dest=replaceSlot;}}
 p.pending={primaryId,stance,secondaryId,dest,replaceSlot};return true;}
function finalizeCommits(g){for(let i=0;i<2;i++){
 const p=g.players[i],c=p.pending;if(!c)throw Error('Engagement manquant');const cp=p.hand.findIndex(x=>x.id===c.primaryId);p.primary=p.hand.splice(cp,1)[0];p.stance=c.stance;if(c.secondaryId){if(p.secondary[c.dest])discardReplace(g,i,c.dest);const ix=p.hand.findIndex(x=>x.id===c.secondaryId);if(ix<0)throw Error('Secondaire absente');p.secondary[c.dest]={card:p.hand.splice(ix,1)[0],placedTurn:g.turn,active:false};log(g,`${i===0?'Vous préparez':'Le rival prépare'} une Secondaire face cachée.`);}p.pending=null;
 }g.phase='lecture';check(g);}
export function commitHero(g,primaryId,stance,secondaryId=null,replaceSlot=null){commit(g,0,primaryId,stance,secondaryId,replaceSlot);const ai=chooseAICommit(g);commit(g,1,ai.primaryId,ai.stance,ai.secondaryId,ai.replaceSlot);finalizeCommits(g);}
export function doLecture(g,heroUse=false,heroStance=null){if(g.phase!=='lecture')throw Error('Phase invalide');const hero=g.players[0],enemy=g.players[1];const enemyInitial=enemy.stance,heroInitial=hero.stance;
 const aiUse=enemy.techs.includes('Lecture')&&!enemy.techUsed&&enemy.insight>=2&&g.rng()<0.23;
 if(heroUse){if(hero.lastTechnique!=='Lecture'&&!useTech(g,0,'Lecture'))throw Error('Lecture impossible');if(heroStance&&!['assault','guard'].includes(heroStance))throw Error('Posture de Lecture invalide');if(heroStance)hero.stance=heroStance;log(g,`Lecture : mode adverse initial ${enemyInitial==='assault'?'Assaut':'Garde'}.`,0);}
 if(aiUse){useTech(g,1,'Lecture');enemy.stance=heroInitial==='assault'?'guard':'assault';log(g,'Le rival adapte secrètement sa posture après Lecture.');}
 g.phase='tactics';for(let i=0;i<2;i++){const p=g.players[i];log(g,`${i===0?'Vous révélez':'Le rival révèle'} ${p.primary.name}, ${p.stance==='assault'?'ASSAUT':'GARDE'} (Puissance ${p.primary.power}).`);}
 for(let i=0;i<2;i++){const p=g.players[i],e=p.primary.effect;if(e==='Clairvoyance voilée'){const op=g.players[1-i];const c=randomOf(op.hand,g.rng);if(c)log(g,`Clairvoyance : main adverse → ${cardText(c)}`,i);const hidden=op.secondary.map((s,j)=>({s,j})).filter(x=>x.s&&!x.s.active).sort((a,b)=>a.s.placedTurn-b.s.placedTurn||a.j-b.j)[0];if(hidden)log(g,`Clairvoyance : ancienne Secondaire cachée → ${cardText(hidden.s.card)}`,i);log(g,`${who(i)} déclenche Clairvoyance voilée.`);}}
 check(g);
}
export function dmgCoeff(card,primary){if(card.effect==='Convergence'&&card.family!==primary.family)return 6;return card.rank+(card.family===primary.family||card.effect==='Prisme'?1:0);}
// Affinité proposée V3.1 : un soutien de même famille donne aussi +1 au score de Rang.
// La comparaison d'Interférence garde le Rang imprimé, sans ce bonus.
export function rankCoeff(card,primary){return card.rank+(card.family===primary.family?1:0);}
function activeSlots(p){return p.secondary.map((s,i)=>s?.active?i:null).filter(x=>x!==null);}
export function legalTactic(g,i,slot,plan){const p=g.players[i],s=p.secondary[slot];if(!s?.active||!plan)return false;if(!['keep','rank','damage','interfere'].includes(plan.mode))return false;if(plan.mode==='damage'&&p.stance!=='assault')return false;if(plan.mode==='interfere'){if(![0,1].includes(plan.target))return false;const target=g.players[1-i].secondary[plan.target];if(!target?.active)return false;if(g.players[1-i].masked.has(plan.target))return true;return s.card.rank>=target.card.rank;}return true;}
export function setTactics(g,i,plans,tech=null){if(g.phase!=='tactics')throw Error('Phase invalide');const p=g.players[i];if(p.tactics)throw Error('Tactiques déjà saisies');const normalized=[0,1].map(slot=>{if(!p.secondary[slot]?.active)return null;const plan=plans[slot]||{mode:'keep'};if(!legalTactic(g,i,slot,plan))throw Error(`Action illégale en emplacement ${slot+1}`);return {...plan};});
 if(tech){if(tech.name==='Ancrage'&&(!normalized[tech.slot]||normalized[tech.slot]?.mode==='keep'))throw Error('Ancrage exige une utilisation');if(tech.name==='Rupture'&&(p.stance!=='guard'||!g.players[1-i].secondary[tech.slot]?.active))throw Error('Rupture exige Garde et une cible active');if(!useTech(g,i,tech.name,{slot:tech.slot}))throw Error('Technique impossible');}
 p.tactics=normalized;}
function gain(g,i,reason){const p=g.players[i];if(p.gained===0&&p.insight<2){p.insight++;p.gained=1;log(g,`${who(i)} gagne 1 Insight (${reason}).`);}}
function resultTitle(winner,modes){if(winner===null)return modes.every(x=>x==='guard')?'Deux Gardes':'Égalité kamikaze';return winner===0?'Vous dominez le Clash':'Le rival domine le Clash';}
function primaryCancelledBySilence(g,used){return [0,1].map(i=>used[1-i].some(u=>u?.effect==='Silence'&&u.success&&!u.cancelled&&u.targetRank===4));}
export function resolveTactics(g,heroPlans,heroTech=null,enemyOverride=null){if(g.phase!=='tactics')throw Error('Phase invalide');setTactics(g,0,heroPlans,heroTech);const aip=enemyOverride||chooseAITactics(g);setTactics(g,1,aip.plans,aip.tech);const players=g.players,used=[[],[]];const primarySnapshot=players.map(p=>p.primary);
 for(let i=0;i<2;i++)for(let s=0;s<2;s++){const slot=players[i].secondary[s],plan=players[i].tactics[s];if(slot?.active&&plan&&plan.mode!=='keep')used[i][s]={slot:s,card:slot.card,effect:slot.card.effect,...plan,success:false,cancelled:false,targetRank:null};}
 // La fenêtre de décisions est terminée : les deux tactiques sont désormais publiques.
 // On affiche la source des bonus, et non seulement M, pour rendre la victoire explicable.
 for(let i=0;i<2;i++)for(let slot=0;slot<2;slot++){
  const s=players[i].secondary[slot],plan=players[i].tactics[slot];
  if(!s?.active||!plan)continue;
  const hidden=players[i].masked.has(slot),subject=hidden?`Secondaire masquée (case ${slot+1})`:s.card.name;
  const detail=plan.mode==='rank'?(hidden?'bonus de Rang masqué':`+${rankCoeff(s.card,players[i].primary)} au Rang${s.card.family===players[i].primary.family?' (affinité +1)':''}`):
   plan.mode==='damage'?(hidden?'coefficient masqué':`×${dmgCoeff(s.card,players[i].primary)} aux dégâts`):
   plan.mode==='interfere'?`Interférence vers case adverse ${plan.target+1}`:'';
  const modeLabel={keep:'CONSERVER',rank:'AMPLIFIER LE RANG',damage:'AMPLIFIER LES DÉGÂTS',interfere:'INTERFÉRER'}[plan.mode];
  log(g,`${who(i)} : ${subject} → ${modeLabel}${detail?' · '+detail:''}.`);
 }
 for(let i=0;i<2;i++)for(const u of used[i])if(u&&u.mode==='interfere'){const target=players[1-i].secondary[u.target],other=used[1-i][u.target];u.targetRank=target?.card.rank??null;u.success=!!(target?.active&&other&&u.card.rank>=target.card.rank);if(u.success){other.cancelled=true;log(g,`${who(i)} Interfère : ${other.card.name} est engagée et annulée.`);}else log(g,`${who(i)} Interfère sans succès (cible conservée ou rang insuffisant).`);}
 const silence=primaryCancelledBySilence(g,used);
 const scores=players.map((p,i)=>p.primary.signature?Infinity:p.primary.rank+used[i].filter(u=>u&&u.mode==='rank'&&!u.cancelled).reduce((sum,u)=>sum+rankCoeff(u.card,p.primary),0));
 const mult=players.map((p,i)=>{const coeffs=used[i].filter(u=>u&&u.mode==='damage'&&!u.cancelled).map(u=>dmgCoeff(u.card,p.primary));return coeffs.length?coeffs.reduce((a,b)=>a+b,0):1;});
 const [a,b]=players;let winner=null,guardWinner=null;let dmg=[0,0];const eq=scores[0]===scores[1];
 if(a.stance==='assault'&&b.stance==='assault'){
  if(!eq)winner=scores[0]>scores[1]?0:1;
  if(eq){dmg=[b.primary.power*mult[1],a.primary.power*mult[0]];}else dmg[1-winner]=players[winner].primary.power*mult[winner];
 }else if(a.stance==='guard'&&b.stance==='guard'){}else{
  const attacker=a.stance==='assault'?0:1,defender=1-attacker;
  winner=scores[attacker]>scores[defender]?attacker:defender;
  if(winner===attacker)dmg[defender]=Math.max(0,players[attacker].primary.power-players[defender].primary.power)*mult[attacker];else guardWinner=defender;
 }
 const mainDamage=[...dmg];
 for(let i=0;i<2;i++){
  const p=players[i],u=used[i];if(silence[i]&&p.primary.effect&&p.primary.effect!=='Clairvoyance voilée')log(g,`${who(i)} : l'effet de Primaire en attente est neutralisé par Silence.`);
  if(p.primary.effect==='Braise'&&!silence[i]&&p.stance==='assault'&&players[1-i].stance==='assault'&&winner===i&&!u.some(v=>v&&v.mode==='damage'&&!v.cancelled)){dmg[1-i]+=2;log(g,'Braise : +2 dégâts fixes.');}
  if(p.primary.effect==='Contrecoup'&&!silence[i]&&p.stance==='assault'&&players[1-i].stance==='assault'&&winner===1-i){dmg[1-i]+=3;log(g,'Contrecoup : riposte fixe de 3 dégâts.');}
  if(winner===i&&p.stance==='assault'&&mainDamage[1-i]>0&&Number.isFinite(scores[i])&&Number.isFinite(scores[1-i])&&scores[i]-scores[1-i]===1&&u.some(v=>v&&v.mode==='rank'&&!v.cancelled&&v.effect==='Étincelle')){dmg[1-i]+=2;log(g,'Étincelle : +2 dégâts fixes.');}
 }
 const positive=dmg.map(x=>x>0);for(let i=0;i<2;i++){players[i].hp=Math.max(0,players[i].hp-dmg[i]);}
 for(let i=0;i<2;i++)for(const u of used[i])if(u&&u.effect==='Écaille'&&u.mode==='rank'&&!u.cancelled&&winner===i&&guardWinner===i){const before=players[i].hp;players[i].hp=Math.min(players[i].maxHp,players[i].hp+2);log(g,`Écaille : ${who(i)} récupère ${players[i].hp-before} PV.`);}
 for(let i=0;i<2;i++){
  if(guardWinner===i)gain(g,i,'Garde victorieuse');if(used[i].some(u=>u&&u.mode==='interfere'&&u.success))gain(g,i,'Interférence réussie');
  for(const u of used[i])if(u&&u.effect==='Ferveur'&&u.mode==='damage'&&!u.cancelled&&winner===i&&players[i].primary.family==='Cendre'&&dmg[1-i]>0)gain(g,i,'Ferveur');
  for(const u of used[i])if(u&&u.effect==='Détour'&&u.mode==='interfere'&&u.success&&!u.cancelled){const c=randomOf(players[1-i].hand,g.rng);if(c)log(g,`Détour observe ${cardText(c)}.`,i);}
 }
 let destinations=[[],[]];for(let i=0;i<2;i++){
  const p=players[i],uArr=used[i];const eligible=uArr.filter(u=>u&&!u.cancelled);const astre=p.primary.effect==='Cycle astral'&&!silence[i]&&winner===i&&eligible.length===1&&['damage','interfere'].includes(eligible[0].mode)&&(eligible[0].mode==='damage'||eligible[0].success);
  for(const u of uArr)if(u){let dest='discard';if(p.techPlan?.name==='Ancrage'&&p.techPlan.slot===u.slot&&u.cancelled)dest='stay';else if(u.effect==='Ténacité'&&u.mode==='rank'&&!u.cancelled&&p.stance==='guard'&&winner===1-i)dest='bottom';else if(u.effect==='Relance'&&u.mode==='interfere'&&u.success&&!u.cancelled&&u.targetRank===3)dest='top';else if(astre&&u===eligible[0])dest='top';destinations[i][u.slot]=dest;}
 }
 const pushes=[];const modesBefore=players.map(p=>p.stance);for(let i=0;i<2;i++){
  const p=players[i],op=players[1-i],signature=p.primary.effect;
  if(signature==='Emprise'&&!silence[i]&&guardWinner===i){const choices=op.secondary.map((s,j)=>s&&(!used[1-i][j]||destinations[1-i][j]==='stay')?j:null).filter(x=>x!==null);if(choices.length)pushes.push({owner:i,choices,kind:'Emprise',racine:used[i].some(u=>u&&u.effect==='Racine'&&u.mode==='rank'&&!u.cancelled)});}
  else if(signature==='Flamme conquérante'&&!silence[i]&&p.stance==='assault'&&winner===i&&dmg[1-i]>0&&used[i].some(u=>u&&u.mode==='damage'&&!u.cancelled)){
   const choices=op.secondary.map((s,j)=>s&&!s.active?j:null).filter(x=>x!==null);if(choices.length)pushes.push({owner:i,choices,kind:'Flamme conquérante'});
  }else if(guardWinner===i){const choices=op.secondary.map((s,j)=>s&&!s.active?j:null).filter(x=>x!==null);if(choices.length)pushes.push({owner:i,choices,kind:'Basic',racine:used[i].some(u=>u&&u.effect==='Racine'&&u.mode==='rank'&&!u.cancelled)});}
  // Une Rupture déclarée n'ouvre pas un deuxième Repoussement : elle remplace le Basic si aucune cible cachée.
  if(guardWinner===i&&p.techPlan?.name==='Rupture'&&!op.secondary.some(s=>s&&!s.active)){
   const slot=p.techPlan.slot;if(op.secondary[slot]?.active&&(!used[1-i][slot]||destinations[1-i][slot]==='stay'))pushes.push({owner:i,choices:[slot],kind:'Rupture'});
  }
 }
 // Consommation AVANT choix de Repoussement : les cartes déjà dépensées ne sont pas des cibles.
 for(let i=0;i<2;i++){
  const p=players[i];for(const u of used[i])if(u){const dest=destinations[i][u.slot];if(dest==='stay'){log(g,`Ancrage préserve ${u.card.name} (action annulée).`);continue;}p.secondary[u.slot]=null;putIn(g,p,u.card,dest);if(dest!=='discard')log(g,`${u.card.name} retourne dans la pioche (${dest==='top'?'sommet':'dessous'}).`);}
  p.discard.push(p.primary);p.primary=null;p.stance=null;p.tactics=null;p.techPlan=null;
 }
 const showScore=(i)=>{
  if(used[i].some(u=>u?.mode==='rank'&&!u.cancelled&&players[i].masked.has(u.slot)))return '?';
  return Number.isFinite(scores[i])?String(scores[i]):'∞';
 };
 const publicScores=[showScore(0),showScore(1)];
 const scoreExpr=(i)=>{
  const p=players[i],primary=primarySnapshot[i];if(primary.signature)return 'Signature ∞';
  const parts=[`Primaire ${primary.rank}`];
  for(const u of used[i])if(u?.mode==='rank'&&!u.cancelled){
   if(p.masked.has(u.slot))parts.push('soutien masqué');
   else parts.push(`${u.card.name} +${rankCoeff(u.card,primary)}`);
  }
  return parts.join(' + ');
 };
 log(g,`Scores de confrontation : Vous ${publicScores[0]} (${scoreExpr(0)}) / Rival ${publicScores[1]} (${scoreExpr(1)}).`);
 let verdict='';
 if(winner===null)verdict=modesBefore.every(x=>x==='guard')?'Deux Gardes : aucun Assaut, aucun vainqueur.':'Égalité des Assauts : les deux attaques frappent simultanément.';
 else if(guardWinner!==null)verdict=`${guardWinner===0?'Vous remportez':'Le rival remporte'} le Clash en GARDE et bloque l’Assaut (Rang ${publicScores[guardWinner]} ≥ ${publicScores[1-guardWinner]}).`;
 else if(modesBefore.includes('guard')){
  const attacker=modesBefore.indexOf('assault'),defender=1-attacker;
  const absorbed=primarySnapshot[attacker].power<=primarySnapshot[defender].power;
  verdict=absorbed?`${attacker===0?'Vous dominez':'Le rival domine'} au Rang, mais la Garde absorbe entièrement l’attaque (Puissance ${primarySnapshot[attacker].power} − ${primarySnapshot[defender].power} → 0 dégât).`:
   `${attacker===0?'Vous dominez':'Le rival domine'} au Rang ; la Garde absorbe ${primarySnapshot[defender].power} Puissance sur ${primarySnapshot[attacker].power}.`;
 }else verdict=`${winner===0?'Vous remportez':'Le rival remporte'} la confrontation des Assauts au Rang.`;
 g.lastResult={winner,guardWinner,scores:scores.map(x=>Number.isFinite(x)?x:'∞'),publicScores,mult,dmg,eq,summary:verdict,silence};
 log(g,`CLASH : ${verdict} · PV perdus : Vous ${dmg[0]} / Rival ${dmg[1]} · M ${mult[0]} / ${mult[1]}.`);
 g.pendingRepels=pushes.filter(x=>x.choices.some(idx=>players[1-x.owner].secondary[idx]));
 if(g.pendingRepels.length){g.phase='repel';applyAIRepels(g);}else endClash(g);
 check(g);
 return g.lastResult;
}
function applyAIRepels(g){for(const push of [...g.pendingRepels])if(push.owner===1){const options=push.choices.filter(slot=>g.players[0].secondary[slot]);if(options.length)applyRepel(g,1,options[0]);}}
export function applyRepel(g,owner,slot){if(g.phase!=='repel')throw Error('Pas de Repoussement');const at=g.pendingRepels.findIndex(x=>x.owner===owner&&x.choices.includes(slot));if(at<0)throw Error('Cible non admissible');const push=g.pendingRepels[at],op=g.players[1-owner],s=op.secondary[slot];if(!s)throw Error('Carte déjà retirée');op.secondary[slot]=null;op.masked.delete(slot);putIn(g,op,s.card,push.kind==='Basic'&&g.players[owner].discard.at(-1)?.effect==='Entrave'?'bottom':'hand');log(g,`${who(owner)} repousse une Secondaire adverse (${push.kind}).`);if(push.racine&&!s.active)log(g,`Racine observe la carte repoussée : ${cardText(s.card)}.`,owner);
 g.pendingRepels.splice(at,1);if(!g.pendingRepels.length)endClash(g);
}
export function skipRepel(g,owner=0){if(g.phase!=='repel')return;g.pendingRepels=g.pendingRepels.filter(x=>x.owner!==owner);if(!g.pendingRepels.length)endClash(g);}
function endClash(g){g.phase='resolved';const dead=g.players.map(p=>p.hp<=0);if(dead[0]&&dead[1]){g.extension++;g.players.forEach(p=>p.hp=1);log(g,`DOUBLE K.-O. → prolongation ${g.extension} : 1 PV chacun.`);}else if(dead.some(Boolean)){g.winner=dead[0]?1:0;g.phase='finished';log(g,`FIN DU DUEL — ${who(g.winner)} gagne.`);}else log(g,`Fin du tour ${g.turn}.`);}
export function nextTurn(g){if(g.phase!=='resolved')throw Error('Le Clash doit être terminé');startTurn(g);}
function chooseAIReveals(g){const p=g.players[1];return eligibleReveal(g,1).filter(()=>g.rng()<0.92);}
function chooseAICommit(g){const p=g.players[1];const choices=p.hand;const signatures=choices.filter(x=>x.signature);let primary=(signatures.length&&g.rng()<0.58)?signatures[0]:[...choices].sort((a,b)=>b.rank-a.rank)[Math.floor(g.rng()*Math.min(3,choices.length))];if(!primary)primary=choices[0];const stance=g.rng()<0.63?'assault':'guard';let remaining=choices.filter(x=>x!==primary&&!x.signature);let secondaryId=null,replaceSlot=null;if(remaining.length&&g.rng()<0.75){const pick=remaining[Math.floor(g.rng()*remaining.length)];secondaryId=pick.id;if(p.secondary.every(Boolean))replaceSlot=g.rng()<0.5?0:1;}return {primaryId:primary.id,stance,secondaryId,replaceSlot};}
function chooseAITactics(g){const p=g.players[1],op=g.players[0];const plans=[null,null];for(const slot of activeSlots(p)){
 let mode='keep',target=null;const visible=op.secondary.map((s,j)=>s?.active?j:null).filter(x=>x!==null);
 if(visible.length&&g.rng()<0.35){const eligible=visible.filter(j=>op.masked.has(j)||p.secondary[slot].card.rank>=op.secondary[j].card.rank);if(eligible.length){mode='interfere';target=randomOf(eligible,g.rng);}}
 if(mode==='keep'&&g.rng()<0.70)mode=p.stance==='assault'?(g.rng()<0.55?'damage':'rank'):'rank';plans[slot]={mode,target};
 }
 let tech=null;if(!p.techUsed&&p.techs.includes('Ancrage')&&p.insight>=1&&g.rng()<0.15){const slot=plans.findIndex(x=>x&&x.mode!=='keep');if(slot>=0)tech={name:'Ancrage',slot};}
 if(!tech&&!p.techUsed&&p.techs.includes('Rupture')&&p.insight>=2&&p.stance==='guard'&&g.rng()<0.30){const slot=op.secondary.findIndex(s=>s?.active);if(slot>=0)tech={name:'Rupture',slot};}
 return {plans,tech};}
export function check(g){for(const p of g.players){const all=[...p.deck,...p.hand,...p.discard,...p.secondary.filter(Boolean).map(s=>s.card),...(p.primary?[p.primary]:[])];if(all.length!==17)throw Error(`${p.name} : conservation des cartes rompue : ${all.length}/17`);const ids=new Set(all.map(x=>x.id));if(ids.size!==17)throw Error(`${p.name} : duplication de carte`);if(p.insight<0||p.insight>2||p.gained>1)throw Error('Insight hors limites');if(p.secondary.length!==2)throw Error('Nombre emplacements invalide');}return true;}
export function publicLog(g,i=0){return g.log.filter(x=>x.privateTo===null||x.privateTo===i).slice(-95);}
