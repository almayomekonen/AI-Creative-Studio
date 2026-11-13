import { SIMPLEX3D, TONEMAP } from "./glsl";

/**
 * SURREAL WORLD — raymarched infinite monolith arches over a mirror sea at dusk, with a floating chrome orb.
 * Uniforms: uDolly (camera travel, world units), uRise (camera height offset), uSun (0..1 sun height), uOrb (0..1 orb glow).
 */
export const SURREAL_WORLD = /* glsl */ `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform float uDolly; uniform float uRise; uniform float uSun; uniform float uOrb;
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
  vec3 top = vec3(0.02,0.02,0.06), mid = vec3(0.22,0.06,0.10), hor = vec3(0.95,0.32,0.12);
  vec3 c = mix(hor, mid, smoothstep(0.0,0.18,h)); c = mix(c, top, smoothstep(0.15,0.6,h));
  float s = max(dot(rd, sunDir()), 0.0);
  c += vec3(1.6,0.6,0.2)*pow(s,10.0)*0.7 + vec3(1.2,0.5,0.2)*pow(s,80.0) + vec3(8.0,4.5,2.0)*smoothstep(0.9990,0.9995,s);
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
  vec3 stone = vec3(0.05,0.035,0.04);
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
  vec3 ro = vec3(3.2 + 0.35*sin(uTime*0.25), 0.9 + uRise, 7.0 - uDolly);
  vec3 ta = ro + vec3(-0.22 - 0.1*sin(uTime*0.25), 0.06 + uRise*0.04, -1.0);
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
