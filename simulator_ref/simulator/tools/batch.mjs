// Simulations de tendance. Ce n'est pas un benchmark d'équilibre compétitif.
import{writeFile}from'node:fs/promises';import{makeGame,check,eligibleReveal,revealPreparation,finishDissipation,commitHero,doLecture,resolveTactics,applyRepel,skipRepel,nextTurn,trimHand}from'../src/engine.mjs';
const opts=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const [k,v]=x.slice(2).split('=');return[k,v??'true'];}));const count=Math.max(1,Math.min(10000,Number(opts.count??300)));const hp=Number(opts.hp||90);const seed=Number(opts.seed||5500);const maxTurns=Number(opts.maxTurns||180);const strategy=opts.strategy||'mixed';const families=['Cendre','Voile','Ronce','Astre'];const rows=[];
for(let n=0;n<count;n++){
 const g=makeGame({seed:seed+n,heroSignature:families[n%4],enemySignature:families[(n+2)%4],heroHp:hp,enemyHp:hp,techs:['Ancrage','Lecture']});let dmgA=0,dmgB=0;
 for(let step=0;step<maxTurns*9&&g.phase!=='finished'&&g.turn<=maxTurns;step++){
  const p=g.players[0];if(g.phase==='trim')trimHand(g,p.hand.slice(4).map((_,idx)=>idx+4));
  else if(g.phase==='prepare')revealPreparation(g,eligibleReveal(g,0));
  else if(g.phase==='dissipation')finishDissipation(g);
  else if(g.phase==='commit'){
   const sig=p.hand.find(c=>c.signature);const primary=(sig&&g.rng()<.5)?sig:p.hand[Math.floor(g.rng()*p.hand.length)];
   const sub=p.hand.filter(c=>c!==primary&&!c.signature);const support=sub.length&&g.rng()<.72?sub[Math.floor(g.rng()*sub.length)]:null;
   const stance=strategy==='defense'?(g.rng()<.52?'guard':'assault'):strategy==='offense'?(g.rng()<.86?'assault':'guard'):(g.rng()<.66?'assault':'guard');
   commitHero(g,primary.id,stance,support?.id??null,support&&p.secondary.every(Boolean)?0:null);
  }else if(g.phase==='lecture')doLecture(g,false);
  else if(g.phase==='tactics'){
   const plans=p.secondary.map(s=>!s?.active?{mode:'keep'}:{mode:g.rng()<.18?'keep':p.stance==='assault'&&g.rng()<.7?'damage':'rank'});
   const r=resolveTactics(g,plans);dmgA+=r.dmg[1];dmgB+=r.dmg[0];
  }else if(g.phase==='repel'){const choice=g.pendingRepels.find(x=>x.owner===0);if(choice){const slot=choice.choices.find(j=>g.players[1].secondary[j]);if(slot!==undefined)applyRepel(g,0,slot);else skipRepel(g);}else skipRepel(g);}
  else if(g.phase==='resolved')nextTurn(g);else throw Error('Phase sans traitement: '+g.phase);
  check(g);
 }
 rows.push({seed:seed+n,turns:g.turn,winner:g.phase==='finished'?(g.winner===0?'hero':'rival'):'unfinished',extensions:g.extension,damageHero:dmgA,damageRival:dmgB});
}
const finished=rows.filter(x=>x.winner!=='unfinished');const average=x=>x.reduce((a,b)=>a+b,0)/(x.length||1);const result={type:'simulations-heuristiques',games:count,finished:finished.length,averageTurns:Math.round(average(finished.map(x=>x.turns))*100)/100,heroWinRate:Math.round(finished.filter(x=>x.winner==='hero').length/(finished.length||1)*1000)/10,extensionRate:Math.round(rows.filter(x=>x.extensions>0).length/count*1000)/10,parameters:{hp,strategy,seed,maxTurns},warning:'Les politiques sont heuristiques. Ne pas confondre avec un équilibre humain mesuré.'};
console.log(JSON.stringify(result,null,2));if(opts.csv){const csv=['seed,turns,winner,extensions,damageHero,damageRival',...rows.map(x=>Object.values(x).join(','))].join('\n');await writeFile(opts.csv,csv);console.log(`CSV enregistré : ${opts.csv}`);}
