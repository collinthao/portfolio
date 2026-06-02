import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const loader = new GLTFLoader();
let points;



const mat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    scale: { value: 2.5 }
  },
  vertexShader: `
    uniform float time;
    uniform float scale;
    out vec3 vNormal;

    

    void main() {
      vec3 p = position;
      vNormal = normal;
      p += normal * sin(time + p.y * 8.0) * 0.05;
      vec4 mv = modelViewMatrix * vec4(p * scale, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = 2.0;
    }
  `,
  fragmentShader: `
    in vec3 vNormal;
    void main() {
      gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
    }
  `,
  side: THREE.DoubleSide
});

const rayMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    uniform float time;
    uniform vec2 iResolution;
    varying vec2 vUv;

    #define TAU 6.28318530718

    void lookAt(inout vec3 rd, vec3 ro, vec3 ta, vec3 up){
        vec3 w=normalize(ta-ro),u=normalize(cross(w,up));
        rd=rd.x*u+rd.y*cross(u,w)+rd.z*w;
    }

    void rot(inout vec3 p, vec3 a, float t){
      a=normalize(a);
      vec3 u=cross(a,p),v=cross(a,u);
      p=u*sin(t)+v*cos(t)+a*dot(a,p);
    }

    #define hash(p)fract(sin((p)*12345.5))

    vec3 randVec(float s)
    {
        vec2 n=hash(vec2(s,s+215.3))*TAU;
        return vec3(cos(n.y)*cos(n.x),sin(n.y),cos(n.y)*sin(n.x));
    }

    #define sabs(p,k)sqrt((p)*(p)+k)

    void sfold(inout vec2 p, vec2 v, float k)
    {
        float g=dot(p,v);
        p-=(g-sabs(g,k))*v;
    }

    void sfold45(inout vec2 p, float k)
    {
        vec2 v=normalize(vec2(1.,-1.));
        sfold(p,v,k);
    }

    float map(vec3 p){

      float k=.02;
      // reduce iterations for speed (less detail)
      float itr=5.;
      float t=time*0.00118;
      vec3 axis=randVec(hash(floor(t)*23.45+123.4));
      rot(p,p.xzy, time);
      rot(p,p.zxz, time);
      for(float i=0.;i<itr;i++)
      {
          p=abs(p)-1.;
          rot(p,axis,(t));
          p*=2.;
      }
      return length(p.xz)/exp2(itr)-.001;
    }

    vec3 calcNormal(vec3 p)
    {
      vec3 n=vec3(0);
      // fewer samples for normal estimation to save time
      for(int i=0; i<3; i++){
        vec3 e=.001*(vec3(float(9>>i&1), float(i>>1&1), float(i&1))*2.-1.);
        n+=e*map(p+e);
      }
      return normalize(n);
    }

    float march(vec3 ro, vec3 rd, float near, float far)
    {
        float t=near; float d;
        // reduce marching steps for speed
        for(int i=0;i<40;i++)
        {
            d=map(ro+rd*t);
            t+=d;
            if (d<.001) return t;
            if (t>=far) return far;
        }
        return far;
    }

    vec3 doColor(vec3 p)
    {
        //return cos(vec3(7.,6.,4.)+p*.5)*.5+.5;
        return vec3(0., 0., 0.8);
    }

    void main(){
        vec2 fragCoord = vUv * iResolution;
        vec2 uv = (fragCoord*2. - iResolution.xy) / iResolution.y;
        // cheap screen-space cull: skip expensive raymarch for far-off pixels
        if(length(uv) > 1.5) { gl_FragColor = vec4(0.0); return; }
        vec3 ro = vec3(0.,0.,6.);
        vec3 rd = normalize(vec3(uv,2.));
        vec3 ta = vec3(0.);
        lookAt(rd,ro,ta,vec3(0.,1.,0.));
        vec3 col = vec3(0.,0.,.15);
        const float maxd = 50.;
        float t = march(ro,rd,0.,maxd);
        if(t<maxd){
            vec3 p = ro + rd*t;
            col = doColor(p);
            vec3 n = calcNormal(p);
            vec3 lightPos = ro + vec3(2.,5.,2.);
            vec3 li = lightPos - p;
            float len = length(li);
            li /= len;
            float dif = clamp(dot(n,li),0.,1.);
            col *= max(dif,.2);
            float rimd = pow(clamp(1.-dot(reflect(-li,n),-rd),0.,1.),2.5);
            float frn = rimd + 2.2*(1.-rimd);
            col *= frn*.6;
            col += vec3(0.8,0.6,1.2)*pow(clamp(dot(reflect(rd,n),li),0.,100.),10.);
            //col += vec3(1800.8,70.6,1.2)*pow(clamp(dot(reflect(rd,n),li),0.,100.),10.);
        }
        col *= 1.5*vec3(0.5,0.5,0.5);
        gl_FragColor = vec4((col),1.0);
    }
  `,
  side: THREE.DoubleSide
});

const rayMat2 = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    uniform float time;
    uniform vec2 iResolution;
    varying vec2 vUv;

#define A(x,y) abs(dot(sin(t+x), s/vec3(y)))

void main() {
    vec2 u = vUv;
    float d = 0.0;
    float s = 0.0;
    float l = 0.0;
    float t = time + sin(time) * 0.5;
    vec3 q = vec3(0.0);
    vec3 p = vec3(0.0);
    vec2 r = iResolution;
    vec4 o = vec4(0.0);
    vec2 fragCoord = u * r;
    vec2 uv = (fragCoord * 2.0 - r) / r.y;

    for(int ii = 0; ii < 100; ii++) {
      l = length(vec2(d - 130.0, p));
      p *= vec3(0.125, 0.6, 1.0);
      d += s = min(0.2 + 0.4 * abs(q.y + 20.0 + sin(l * 0.2 - t * 10.0)),
                   0.3 + 0.3 * abs(3.0 - length(p.xy)) + step(q.y, -12.0));
      o += 1.0 / s;
      q = p = vec3(d * (uv + uv - r) / r.y, d - 70.0);
      p.yz *= mat2(0.36, -0.93, 0.93, 0.36);
      p.z += t * 30.0;
      for(s = 0.03; s < 4.0; s += s) {
        p.yz -= A(t + 0.32 * p / s, 1.0);
        q += A(0.3 * q.z + 0.7 * q / s, 8.0);
      }
    }

    gl_FragColor = vec4(tanh(o * o / 20000.0));
}
  `,
  side: THREE.DoubleSide
});
async function loadModel() {
    const gltf = await loader.loadAsync(  '/DamagedHelmet.glb');
    points = new THREE.Points( gltf.scene.children[  0  ].geometry, mat );
    scene.add( points );
};

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
const geometry = new THREE.PlaneGeometry( 30, 10, 1, 1 );
const plane = new THREE.Mesh( geometry, rayMat );
scene.add( plane );

camera.position.z = 5;

function animate( time ) {
  mat.uniforms.time.value = time / 1000;
  rayMat.uniforms.time.value = time / 10000.;
  rayMat.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);

    renderer.render( scene, camera );
}
async function main() 
{
 //   await loadModel();
    renderer.setAnimationLoop( animate );
}

main();