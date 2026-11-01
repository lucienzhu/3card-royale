/* Versioned entry point. The rules engine still receives one complete action. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./index.js'),require('./actions.js'));
  else root.ThreeCardRoyaleV2=factory(root.ThreeCardRoyale,root.RoyaleActions);
})(typeof globalThis!=='undefined'?globalThis:this,function(SDK,A){
  class Game extends SDK.Game {
    structuredObservation(who=this.actor===null?0:this.actor){return A.observation(super.observation(who));}
    grammar(){const o=super.observation(this.actor===null?0:this.actor);o.legal_actions=super.legalActions();return A.build(o);}
    stepStructured(action){return super.step(this.grammar().validate(action).legacy);}
    stepTokens(tokens){return super.step(this.grammar().resolve(tokens).legacy);}
    static restore(saved){const game=SDK.Game.restore(saved);Object.setPrototypeOf(game,Game.prototype);return game;}
  }
  return {...SDK,Game,actions:A,actionSchema:A.VERSION};
});
