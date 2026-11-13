import { SIMPLEX3D, TONEMAP } from "./glsl";

/**
 * SURREAL WORLD — raymarched infinite monolith arches over a mirror sea, with a floating chrome orb.
 * Uniforms: uDolly (camera travel), uRise (camera height offset), uSun (0..1 sun height), uOrb (0..1 orb glow),
 * palette uTop/uMid/uHor (sky zenith→horizon) and uStone (arch albedo). Presets: SURREAL_DUSK, SURREAL_DAWN.
 */
export const SURREAL_DUSK = { uCamX: 3.2, uTop: [0.02, 0.02, 0.06], uMid: [0.22, 0.06, 0.1], uHor: [0.95, 0.32, 0.12], uStone: [0.05, 0.035, 0.04] } as const;
export const SURREAL_DAWN = { uCamX: 3.2, uTop: [0.18, 0.14, 0.38], uMid: [0.62, 0.42, 0.7], uHor: [1.0, 0.72, 0.78], uStone: [0.42, 0.34, 0.46] } as const;
export const SURREAL_WORLD = /* glsl */ `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform float uDolly; uniform float uRise; uniform float uSun; uniform float uOrb; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uStone; uniform float uCamX;
varying vec2 vUv;
${SIMPLEX3D}
${TONEMAP}

float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }
float sdArch(vec3 p){
  float outer = sdBox(p-vec3(0.0,2.6,0.0), vec3(2.6,2.6,0.32));
  float hole = min(length(p.xy-vec2(0.0,2.6))-1.45, sdBox(p-vec3(0.0,1.3,0.0), vec3(1.45,1.3,1.0)));
  return max(outer,-hole);
}
const float CELL = 8.0;
vec3 orbPos(){ return vec3(0.0, 2.5 + 0.18*sin(uTime*0.9), -18.0); }
float map(vec3 p, out float id){
  vec3 q = p; q.z = mod(q.z + CELL*0.5, CELL) - CELL*0.5;
  float a = sdArch(q);
  float o = length(p - orbPos()) - 0.9;
  id = a < o ? 1.0 : 2.0;
  return min(a,o);
}
vec3 calcNormal(vec3 p){ float id; vec2 e=vec2(0.0015,0.0);
  return normalize(vec3(map(p+e.xyy,id)-map(p-e.xyy,id), map(p+e.yxy,id)-map(p-e.yxy,id), map(p+e.yyx,id)-map(p-e.yyx,id))); }

vec3 sunDir(){ return normalize(vec3(0.0, mix(-0.02,0.22,uSun), -1.0)); }
vec3 sky(vec3 rd){
  float h = rd.y;
  vec3 top = uTop, mid = uMid, hor = uHor;
  vec3 c = mix(hor, mid, smoothstep(0.0,0.18,h)); c = mix(c, top, smoothstep(0.15,0.6,h));
  float s = max(dot(rd, sunDir()), 0.0);
  c += hor*1.6*pow(s,10.0)*0.7 + hor*1.2*pow(s,80.0) + vec3(8.0,6.0,4.0)*smoothstep(0.9990,0.9995,s);
  // drifting cloud bands
  float cl = fbm(vec3(rd.x*3.0 + uTime*0.02, rd.y*14.0, 1.0));
  c = mix(c, c*0.55 + vec3(0.25,0.08,0.1), smoothstep(0.1,0.6,cl)*smoothstep(0.02,0.12,h)*smoothstep(0.4,0.15,h));
  return c;
}
vec3 shadeObj(vec3 p, vec3 rd, float id){
  vec3 n = calcNormal(p); vec3 l = sunDir();
  if (id > 1.5) { // chrome orb reflects the sky + glows
    vec3 r = reflect(rd,n); vec3 c = sky(r)*0.9;
    float f = pow(1.0-max(dot(n,-rd),0.0),3.0);
    return c*(0.6+f) + vec3(1.6,0.7,0.3)*uOrb*(0.4+f);
  }
  float dif = max(dot(n,l),0.0);
  float rim = pow(1.0-max(dot(n,-rd),0.0),4.0);
  vec3 stone = uStone;
  float ao = clamp(p.y*0.35,0.2,1.0);
  return stone*(0.12 + dif*vec3(1.4,0.7,0.4)) * ao + rim*vec3(1.0,0.42,0.2)*0.35;
}
vec3 trace(vec3 ro, vec3 rd, out float hitT){
  float t = 0.0; float id = 0.0;
  for (int i=0;i<110;i++){
    vec3 p = ro + rd*t; float d = map(p,id);
    if (d < 0.0008*t){ hitT=t; vec3 c = shadeObj(p,rd,id); float fog = 1.0-exp(-t*0.009); return mix(c, sky(rd)*0.7, fog); }
    t += d; if (t>140.0) break;
  }
  hitT = 1e5; return sky(rd);
}
void main(){
  vec2 uv = (vUv-0.5)*vec2(uRes.x/uRes.y,1.0);
  vec3 ro = vec3(uCamX + 0.35*sin(uTime*0.25), 0.9 + uRise, 7.0 - uDolly);
  vec3 ta = ro + vec3(-0.07*uCamX - 0.1*sin(uTime*0.25), 0.06 + uRise*0.04, -1.0);
  vec3 fw = normalize(ta-ro), rt = normalize(cross(fw, vec3(0,1,0))), up = cross(rt,fw);
  vec3 rd = normalize(uv.x*rt + uv.y*up + 1.7*fw);
  vec3 col;
  float tObj;
  vec3 direct = trace(ro, rd, tObj);
  // mirror sea at y=0
  float tSea = rd.y < 0.0 ? -ro.y/rd.y : 1e5;
  if (tSea < tObj) {
    vec3 p = ro + rd*tSea;
    vec3 n = normalize(vec3(0.0,1.0,0.0) + 0.035*vec3(snoise(vec3(p.xz*0.6, uTime*0.4)), 0.0, snoise(vec3(p.zx*0.6+7.0, uTime*0.4))));
    vec3 rr = reflect(rd, n); float tr;
    vec3 refl = trace(p + n*0.01, rr, tr);
    float fres = 0.04 + 0.96*pow(1.0-max(dot(n,-rd),0.0),5.0);
    col = mix(vec3(0.01,0.008,0.015), refl, 0.25 + 0.65*fres);
    col = mix(col, sky(rd)*0.7, 1.0-exp(-tSea*0.009));
  } else col = direct;
  // atmospheric haze + grade
  col *= 1.0 - 0.25*dot(uv,uv);
  gl_FragColor = vec4(finish(col*1.05), 1.0);
}
`;

/** LIQUID GRADIENT — slow flowing domain-warped colour field (backgrounds, transitions). Uniforms: uA, uB, uC (vec3 colours), uFlow. */
export const LIQUID_GRADIENT = /* glsl */ `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uFlow;
varying vec2 vUv;
${SIMPLEX3D}
void main(){
  vec2 p = (vUv-0.5)*vec2(uRes.x/uRes.y,1.0)*0.7;
  float t = uTime*0.15*uFlow;
  vec2 q = vec2(fbm(vec3(p,t)), fbm(vec3(p+5.2,t)));
  vec2 r = vec2(fbm(vec3(p+2.0*q+1.7,t)), fbm(vec3(p+2.0*q+9.2,t)));
  float f = fbm(vec3(p+2.0*r,t));
  vec3 c = mix(uA, uB, clamp(f*1.8+0.5,0.0,1.0));
  c = mix(c, uC, clamp(length(r)*0.9,0.0,1.0));
  gl_FragColor = vec4(pow(c, vec3(0.95)), 1.0);
}
`;

/**
 * PORTAL TUNNEL — flying through rings of light (warp / portal / energy). Uniforms: uSpeed, uColA, uColB (vec3), uTwist, uFlash (0..1 beat hit).
 */
export const PORTAL_TUNNEL = /* glsl */ `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform float uSpeed; uniform vec3 uColA; uniform vec3 uColB; uniform float uTwist; uniform float uFlash;
varying vec2 vUv;
${SIMPLEX3D}
${TONEMAP}
void main(){
  vec2 p = (vUv-0.5)*vec2(uRes.x/uRes.y,1.0)*2.0;
  float r = length(p); float a = atan(p.y,p.x);
  float z = 0.35/(r+0.02) + uTime*uSpeed;               // depth along the tunnel
  float ang = a + uTwist*z*0.15;
  float rings = smoothstep(0.92,1.0, sin(z*6.2831*1.2)*0.5+0.5);
  float ribs = smoothstep(0.85,1.0, sin(ang*12.0)*0.5+0.5) * (0.3+0.7*smoothstep(0.4,1.0,snoise(vec3(ang*2.0, z*0.6, uTime*0.4))));
  float energy = smoothstep(0.55,1.0, snoise(vec3(cos(ang)*1.5, sin(ang)*1.5, z*0.8)));
  vec3 col = mix(uColA, uColB, 0.5+0.5*sin(z*0.7));
  vec3 c = col*(rings*1.8 + ribs*0.7 + energy*1.2);
  c *= smoothstep(0.0,0.55,r);                            // dark core = the portal mouth
  c += col*pow(max(0.0,1.0-r*1.4),6.0)*0.0;
  c += uColA*exp(-r*5.0)*uFlash*4.0;                      // core flash on beat
  c *= 1.0 - smoothstep(1.2,2.2,r)*0.6;
  gl_FragColor = vec4(finish(c), 1.0);
}
`;

/**
 * LIQUID SILK — slow satin folds catching soft light (beauty, fragrance, fashion). Uniforms: uA (shadow), uB (mid), uC (highlight), uFlow.
 */
export const LIQUID_SILK = /* glsl */ `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uFlow;
varying vec2 vUv;
${SIMPLEX3D}
float h(vec2 p){ float t=uTime*0.25*uFlow;
  return sin(p.x*2.2 + sin(p.y*1.3+t)*1.6 + t) * 0.5 + sin(p.y*1.7 - p.x*0.6 + t*0.8)*0.35 + snoise(vec3(p*0.6, t*0.5))*0.25; }
void main(){
  vec2 p = (vUv-0.5)*vec2(uRes.x/uRes.y,1.0)*3.2;
  float e = 0.01;
  vec3 n = normalize(vec3(h(p-vec2(e,0.0))-h(p+vec2(e,0.0)), h(p-vec2(0.0,e))-h(p+vec2(0.0,e)), 0.06));
  vec3 l = normalize(vec3(-0.4,0.6,0.7));
  float dif = max(dot(n,l),0.0);
  float spec = pow(max(dot(reflect(-l,n), vec3(0,0,1)),0.0), 40.0);
  float sheen = pow(1.0-n.z, 2.0);
  vec3 c = mix(uA, uB, dif); c = mix(c, uC, sheen*0.8) + uC*spec*0.6;
  gl_FragColor = vec4(c, 1.0);
}
`;
