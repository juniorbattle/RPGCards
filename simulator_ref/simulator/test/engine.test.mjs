import test from 'node:test';import assert from 'node:assert/strict';
import {makeGame,makeDeck,POWER,dmgCoeff,rankCoeff,check,resolveTactics,applyRepel,skipRepel,draw,commitHero,doLecture,revealPreparation,finishDissipation,useTech,eligibleReveal,nextTurn} from '../src/engine.mjs';
function take(p,id){for(const key of ['hand','deck','discard']){let at=p[key].findIndex(x=>x.id===id);if(at>=0)return p[key].splice(at,1)[0];}throw Error(`Carte absente : ${id}`);}
function arrange({primary0='Cendre-4',primary1='Ronce-3',stance0='assault',stance1='guard',sec0=[],sec1=[],heroSig='Cendre',enemySig='Ronce'}={}){const g=makeGame({seed:42,heroSignature:heroSig,enemySignature:enemySig,techs:['Ancrage','Rupture'],enemyTechs:['Ancrage','Rupture']});g.turn=3;g.phase='tactics';for(let i=0;i<2;i++){const p=g.players[i];p.primary=take(p,i?primary1:primary0);p.stance=i?stance1:stance0;for(const [j,id] of (i?sec1:sec0).entries())p.secondary[j]={card:take(p,id),placedTurn:1,active:true};}check(g);return g;}
function run(g,a=[],b=[],at=null,bt=null){const arr=x=>[0,1].map(i=>x[i]?x[i]:{mode:'keep'});const r=resolveTactics(g,arr(a),at,{plans:arr(b),tech:bt});check(g);return r;}
test('deck standard 17 cartes uniques / Puissances officielles / Signature',()=>{const a=makeDeck('Cendre');assert.equal(a.length,17);assert.equal(new Set(a.map(x=>x.id)).size,17);for(let n=1;n<=4;n++)assert.equal(a.find(x=>x.id===`Cendre-${n}`).power,POWER[n]);assert.equal(a.find(x=>x.signature).power,14);});
test('assaut IV sans amplification sur Garde III = 3',()=>{const g=arrange();const r=run(g);assert.equal(r.dmg[1],3);assert.equal(r.winner,0);});
test('attaque contre attaque gagnante à score supérieur : P×M',()=>{const g=arrange({primary1:'Ronce-2',stance1:'assault',sec0:['Cendre-3','Cendre-2']});const r=run(g,[{mode:'damage'},{mode:'damage'}]);assert.equal(r.mult[0],7);assert.equal(r.dmg[1],84);});
test('garde III absorbe différentiel avant les coefficients',()=>{const g=arrange({sec0:['Cendre-3','Cendre-2']});const r=run(g,[{mode:'damage'},{mode:'damage'}]);assert.equal(r.dmg[1],21);});
test('amplification de Rang ne change pas Puissance',()=>{const g=arrange({primary0:'Cendre-3',primary1:'Ronce-4',stance1:'assault',sec0:['Cendre-2']});const r=run(g,[{mode:'rank'}]);assert.equal(r.scores[0],6);assert.equal(r.dmg[1],9);});
test('égalité A/A = dégâts simultanés puis double KO',()=>{const g=arrange({primary1:'Ronce-4',stance1:'assault',sec0:['Cendre-3']});g.players[0].hp=9;g.players[1].hp=35;const r=run(g,[{mode:'damage'}]);assert.equal(r.dmg[0],12);assert.equal(r.dmg[1],48);assert.equal(g.extension,1);assert.equal(g.players[0].hp,1);assert.equal(g.players[1].hp,1);});
test('Signature ∞ domine Garde IV sans rang numérique infini et 18 dégâts avec ×9',()=>{const g=arrange({primary0:'signature-Cendre',primary1:'Ronce-4',sec0:['Cendre-4','Cendre-3']});const r=run(g,[{mode:'damage'},{mode:'damage'}]);assert.equal(r.scores[0],'∞');assert.equal(r.mult[0],9);assert.equal(r.dmg[1],18);});
test('deux Signatures ∞ Assaut s’échangent leur Puissance',()=>{const g=arrange({primary0:'signature-Cendre',primary1:'signature-Ronce',stance1:'assault'});const r=run(g);assert.equal(r.winner,null);assert.deepEqual(r.dmg,[12,14]);});
test('Interférence annule amplification utilisée et consomme les deux',()=>{const g=arrange({primary1:'Ronce-2',stance1:'assault',sec0:['Cendre-3'],sec1:['Ronce-4']});const r=run(g,[{mode:'damage'}],[{mode:'interfere',target:0}]);assert.equal(r.mult[0],1);assert.equal(r.dmg[1],12);assert.equal(g.players[0].secondary[0],null);assert.equal(g.players[1].secondary[0],null);});
test('Interférence échoue quand la cible Conserve',()=>{const g=arrange({sec0:['Cendre-3'],sec1:['Ronce-4']});run(g,[{mode:'keep'}],[{mode:'interfere',target:0}]);assert.equal(g.players[0].secondary[0].card.name,'Cendre III');assert.equal(g.players[1].secondary[0],null);});
test('Interférences réciproques, toutes deux valides et donnent Insight aux deux',()=>{const g=arrange({primary0:'Cendre-1',primary1:'Ronce-2',stance1:'assault',sec0:['Cendre-3'],sec1:['Ronce-3']});run(g,[{mode:'interfere',target:0}],[{mode:'interfere',target:0}]);assert.equal(g.players[0].insight,2);assert.equal(g.players[1].insight,2);});
test('Ancrage sauve uniquement la carte, pas son amplification',()=>{const g=arrange({primary1:'Ronce-2',stance1:'assault',sec0:['Cendre-3'],sec1:['Ronce-4']});const r=run(g,[{mode:'damage'}],[{mode:'interfere',target:0}],{name:'Ancrage',slot:0});assert.equal(r.mult[0],1);assert.equal(g.players[0].secondary[0].card.name,'Cendre III');assert.equal(g.players[0].insight,0);});
test('Voile IV Silence neutralise Contrecoup si Interférence sur Rang IV',()=>{const g=arrange({primary0:'Cendre-4',primary1:'Ronce-4',stance1:'assault',sec0:['Astre-4'],sec1:['Voile-4']});const r=run(g,[{mode:'rank'}],[{mode:'interfere',target:0}]);assert.equal(r.silence[0],true);});
test('Écaille soigne au maximum 2 PV après Garde gagnante',()=>{const g=arrange({primary0:'Ronce-3',primary1:'Cendre-4',stance0:'guard',stance1:'assault',sec0:['Ronce-2']});g.players[0].hp=70;run(g,[{mode:'rank'}]);assert.equal(g.players[0].hp,72);});
test('Astre IV Convergence cross-famille ×6 (et même famille ×5)',()=>{const a=makeDeck('Astre');assert.equal(dmgCoeff(a.find(x=>x.id==='Astre-4'),a.find(x=>x.id==='Cendre-3')),6);assert.equal(dmgCoeff(a.find(x=>x.id==='Astre-4'),a.find(x=>x.id==='Astre-3')),5);});
test('Ronce Entrave pousse sous la pioche, face cachée',()=>{const g=arrange({primary0:'Ronce-3',primary1:'Cendre-2',stance0:'guard',stance1:'assault'});const c=take(g.players[1],'Cendre-1');g.players[1].secondary[0]={card:c,placedTurn:2,active:false};const r=run(g);assert.equal(r.guardWinner,0);assert.equal(g.phase,'repel');applyRepel(g,0,0);assert.equal(g.players[1].deck[0].id,c.id);assert.equal(g.phase,'resolved');});
test('Dissimulation ne montre pas rang cible dans Interférence aveugle, échec si rang insuffisant',()=>{const g=arrange({sec0:['Voile-3','Ronce-4'],sec1:['Ronce-2']});g.players[0].masked.add(1);const r=run(g,[{mode:'keep'},{mode:'rank'}],[{mode:'interfere',target:1}]);assert.equal(r.scores[0],8);assert.equal(g.players[1].insight,1);});
test('Cycle astral recycle exactement un soutien offensif non annulé après victoire',()=>{const g=arrange({primary0:'signature-Astre',primary1:'Ronce-2',stance1:'assault',sec0:['Astre-3'],heroSig:'Astre'});const r=run(g,[{mode:'damage'}]);assert.equal(r.winner,0);assert.equal(g.players[0].deck.at(-1).id,'Astre-3');});
test('signatures + deck après combats : pas de carte fantôme',()=>{const g=makeGame({seed:741,heroSignature:'Cendre'});for(let t=0;t<50;t++){if(g.phase==='finished')break;if(g.phase==='trim'){trimHand(g,g.players[0].hand.slice(4).map((_,idx)=>idx+4));}if(g.phase==='prepare')revealPreparation(g,eligibleReveal(g,0));if(g.phase==='dissipation')finishDissipation(g);if(g.phase==='commit'){const p=g.players[0],c=p.hand[0];const s=p.hand.find(x=>x!==c&&!x.signature);let replace=p.secondary.every(Boolean)?0:null;commitHero(g,c.id,'assault',s?.id,replace);}if(g.phase==='lecture')doLecture(g,false);if(g.phase==='tactics')resolveTactics(g,[{mode:'keep'},{mode:'keep'}]);if(g.phase==='repel')skipRepel(g);if(g.phase==='resolved')nextTurn(g);check(g);}assert.ok(g.turn>=4);});
test('tests de parcours end-to-end moteur : 80 graines, 80 tours maximum',()=>{
 for(let seed=1;seed<=80;seed++){
  const g=makeGame({seed,heroSignature:['Cendre','Voile','Ronce','Astre'][seed%4],enemySignature:['Astre','Ronce','Voile','Cendre'][seed%4],heroHp:90,enemyHp:90,techs:['Lecture','Ancrage']});
  for(let steps=0;steps<800&&g.phase!=='finished'&&g.turn<=80;steps++){
   const p=g.players[0];if(g.phase==='trim')trimHand(g,p.hand.slice(4).map((_,ix)=>ix+4));
   else if(g.phase==='prepare')revealPreparation(g,eligibleReveal(g,0));
   else if(g.phase==='dissipation')finishDissipation(g);
   else if(g.phase==='commit'){const primary=p.hand.find(c=>c.signature)||p.hand[0];const support=p.hand.find(c=>c!==primary&&!c.signature);commitHero(g,primary.id,seed%3===0?'guard':'assault',support?.id??null,p.secondary.every(Boolean)?1:null);}
   else if(g.phase==='lecture')doLecture(g,false);
   else if(g.phase==='tactics'){const plans=p.secondary.map((s,i)=>!s?.active?{mode:'keep'}:{mode:(g.turn+seed+i)%3===0?'rank':p.stance==='assault'?'damage':'keep'});resolveTactics(g,plans);}
   else if(g.phase==='repel'){const rep=g.pendingRepels.find(x=>x.owner===0);if(rep){applyRepel(g,0,rep.choices.find(j=>g.players[1].secondary[j]));}else skipRepel(g);}
   else if(g.phase==='resolved')nextTurn(g);
   else assert.fail('Phase inconnue : '+g.phase);
   check(g);
  }
  assert.ok(g.turn<=81,`Partie #${seed} ne progresse pas`);
 }
});

test('bonus de famille pour le Rang : +1 si Primaire et soutien partagent une famille',()=>{
 const deck=makeDeck('Cendre'), cendre2=deck.find(x=>x.id==='Cendre-2'), ronce2=deck.find(x=>x.id==='Ronce-2'), primary=deck.find(x=>x.id==='Cendre-3');
 assert.equal(rankCoeff(cendre2,primary),3);
 assert.equal(rankCoeff(ronce2,primary),2);
 assert.equal(rankCoeff(cendre2,deck.find(x=>x.signature)),3); // priorité ∞ inchangée
});
test('une Garde II + soutien I même famille peut bloquer un Assaut IV',()=>{
 const same=arrange({primary0:'Cendre-4',primary1:'Ronce-2',stance1:'guard',sec1:['Ronce-1']});
 const r1=run(same,[],[{mode:'rank'}]);assert.equal(r1.scores[1],4);assert.equal(r1.guardWinner,1);assert.equal(r1.dmg[1],0);
 const diff=arrange({primary0:'Cendre-4',primary1:'Ronce-2',stance1:'guard',sec1:['Astre-1']});
 const r2=run(diff,[],[{mode:'rank'}]);assert.equal(r2.scores[1],3);assert.equal(r2.winner,0);assert.equal(r2.dmg[1],6);
});
test('deux soutiens Rang même famille donnent deux fois +1 sans changer les dégâts',()=>{
 const g=arrange({primary0:'Cendre-1',primary1:'Ronce-4',stance1:'assault',sec0:['Cendre-2','Cendre-3']});
 const r=run(g,[{mode:'rank'},{mode:'rank'}]);assert.equal(r.scores[0],8);assert.equal(r.dmg[1],3);assert.equal(r.mult[0],1);
});
test('affinité ne modifie pas le Rang imprimé pour Interférence',()=>{
 const g=arrange({primary0:'Cendre-4',primary1:'Ronce-2',stance1:'assault',sec0:['Cendre-2'],sec1:['Ronce-3']});
 const r=run(g,[{mode:'rank'}],[{mode:'interfere',target:0}]);assert.equal(r.scores[0],4);assert.equal(r.winner,0);
});


test('Régression journal T2 : sans soutien, Cendre III Assaut perd contre Cendre IV Garde',()=>{
 const g=arrange({primary0:'Cendre-3',primary1:'Cendre-4',stance1:'guard'});
 const r=run(g);
 assert.equal(r.winner,1);
 assert.equal(r.guardWinner,1);
 assert.deepEqual(r.scores,[3,4]);
 assert.deepEqual(r.dmg,[0,0]);
 assert.ok(g.log.some(e=>e.msg.includes('Le rival remporte le Clash en GARDE')));
 assert.ok(g.log.some(e=>e.msg.includes('Scores de confrontation : Vous 3')&&e.msg.includes('Rival 4')));
});

test('Régression journal T2 : Cendre III + Cendre I même famille bat Garde IV, sans blesser',()=>{
 const g=arrange({primary0:'Cendre-3',primary1:'Cendre-4',stance1:'guard',sec0:['Cendre-1']});
 const r=run(g,[{mode:'rank'}]);
 assert.deepEqual(r.scores,[5,4]);
 assert.equal(r.winner,0);
 assert.equal(r.guardWinner,null);
 assert.deepEqual(r.dmg,[0,0]);
 assert.match(r.summary,/Vous dominez au Rang, mais la Garde absorbe entièrement/);
 assert.ok(g.log.some(e=>e.msg.includes('Cendre I')&&e.msg.includes('affinité +1')));
 assert.ok(g.log.some(e=>e.msg.includes('Primaire 3 + Cendre I +2')));
 assert.equal(g.phase,'resolved');
});

test('Journal de préparation T2 : révéler une Secondaire indique son activation',()=>{
 const g=makeGame({seed:98});
 const p=g.players[0];
 const c=take(p,'Cendre-1');
 p.secondary[0]={card:c,placedTurn:1,active:false};
 g.turn=2;g.phase='prepare';
 revealPreparation(g,[0]);
 assert.ok(g.log.some(e=>e.msg.includes('Vous révélez et activez Cendre I')));
 assert.equal(p.secondary[0].active,true);
});

test('Dissimulation : le journal public ne dévoile pas une Secondaire masquée simultanément',()=>{
 const g=makeGame({seed:99});const p=g.players[0];
 p.secondary[0]={card:take(p,'Voile-3'),placedTurn:1,active:false};
 p.secondary[1]={card:take(p,'Ronce-2'),placedTurn:1,active:false};
 g.turn=2;g.phase='prepare';revealPreparation(g,[0,1]);
 const publicMsg=g.log.filter(e=>e.privateTo===null).map(x=>x.msg).join('\n');
 assert.match(publicMsg,/identité masquée par un effet/);
 assert.doesNotMatch(publicMsg,/Vous révélez et activez Ronce II/);
});
