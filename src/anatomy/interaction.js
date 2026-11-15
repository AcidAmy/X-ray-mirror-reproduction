// Relative pinch drag: no jump on engagement; release/loss resets the anchor.
export function pinchStep(state, hands, value, bounds, aspect = 1) {
  if (hands.length !== 1 || hands[0].length !== 21) return { active: false, value };
  const h=hands[0], dist=(a,b)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);
  const width=dist(h[5],h[17]);
  const ratio=width>1e-5?dist(h[4],h[8])/width:Infinity;
  const y=(h[4].y+h[8].y)/2;
  if (!Number.isFinite(y) || !Number.isFinite(ratio) || ratio>(state.active?.45:.3)) return {active:false,value};
  if (!state.active) return {active:true,startY:y,startValue:value,value};
  return {...state,value:Math.max(bounds[0],Math.min(bounds[1],state.startValue+(state.startY-y)*(bounds[1]-bounds[0])*1.5))};
}
