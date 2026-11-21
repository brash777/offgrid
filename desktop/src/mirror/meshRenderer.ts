import type { Garment } from './garment';
import type { Lighting } from './scene';
import { deform, surfaceFrames, type Fit } from './skin';

export interface Shade {
  neck: [number, number, number, number];
  neckStrength: number;
}

const SHADING = 0.6;
const OCCLUSION = 0.8;
const LIGHT_WRAP = 0.22;
const SOFTNESS = 0.45;

const VERTEX_SHADER = `#version 300 es
in vec2 position;
in vec2 uv;
in vec4 surfaceFrame;
uniform vec2 resolution;
out vec2 textureUv;
out vec4 frame;
void main() {
  vec2 clip = position / resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  textureUv = uv;
  frame = surfaceFrame;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 textureUv;
in vec4 frame;
uniform sampler2D garment;
uniform sampler2D relief;
uniform sampler2D scene;
uniform vec2 resolution;
uniform vec2 reliefTexel;
uniform float reliefPixels;
uniform float opacity;
uniform float exposure;
uniform vec2 levels;
uniform vec3 tint;
uniform vec3 light;
uniform float shading;
uniform float occlusion;
uniform float lightWrap;
uniform float softness;
uniform vec4 neck;
uniform float neckStrength;
uniform float grain;
uniform float seed;
out vec4 color;

float heightAt(vec2 point) {
  vec2 packed = texture(relief, point).rb;
  return packed.x + packed.y / 255.0;
}

float noise(vec2 point) {
  vec3 p = fract(vec3(point.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  float area = frame.x * frame.w - frame.z * frame.y;
  float trust = smoothstep(0.15, 0.45, area / max(length(frame.xy) * length(frame.zw), 0.0001));
  float safeArea = max(abs(area), 0.0001);
  vec2 acrossUv = vec2(frame.w, -frame.y) / safeArea;
  vec2 downUv = vec2(-frame.z, frame.x) / safeArea;
  vec4 texel = texture(garment, textureUv, softness);
  vec3 albedo = texel.rgb / max(texel.a, 0.001);
  vec3 packedSurface = texture(relief, textureUv).rgb;
  vec2 surface = vec2(packedSurface.r + packedSurface.b / 255.0, packedSurface.g);
  float right = heightAt(textureUv + vec2(reliefTexel.x, 0.0));
  float left = heightAt(textureUv - vec2(reliefTexel.x, 0.0));
  float below = heightAt(textureUv + vec2(0.0, reliefTexel.y));
  float above = heightAt(textureUv - vec2(0.0, reliefTexel.y));
  vec2 gradient = vec2((right - left) / (2.0 * reliefTexel.x), (below - above) / (2.0 * reliefTexel.y));
  vec2 slope = vec2(dot(gradient, acrossUv), dot(gradient, downUv)) * reliefPixels * trust;
  vec3 normal = normalize(vec3(-slope, 1.0));
  float facing = 0.45 + 0.55 * max(dot(normal, light), 0.0);
  float flatFacing = 0.45 + 0.55 * max(light.z, 0.0);
  float lit = mix(1.0, facing / flatFacing, shading);
  float cavity = mix(occlusion, 1.0, smoothstep(0.0, 0.55, surface.r));

  vec2 pixel = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
  vec2 fromNeck = (pixel - neck.xy) / neck.zw;
  float chin = 1.0 - neckStrength * exp(-dot(fromNeck, fromNeck));

  vec3 shaded = albedo * exposure * lit * cavity * chin;
  shaded = levels.x + shaded * (levels.y - levels.x);
  shaded *= tint;
  vec3 around = texture(scene, pixel / resolution).rgb;
  shaded = mix(shaded, around, lightWrap * (1.0 - smoothstep(0.0, 0.3, surface.r)));
  shaded += (noise(pixel + seed * 17.0) - 0.5) * grain;

  float alpha = texel.a * surface.g * opacity;
  color = vec4(clamp(shaded, 0.0, 1.0) * alpha, alpha);
}`;

const UNIFORMS = [
  'resolution',
  'reliefTexel',
  'reliefPixels',
  'opacity',
  'exposure',
  'levels',
  'tint',
  'light',
  'shading',
  'occlusion',
  'lightWrap',
  'softness',
  'neck',
  'neckStrength',
  'grain',
  'seed',
  'garment',
  'relief',
  'scene',
] as const;

type UniformName = (typeof UNIFORMS)[number];

interface MeshBuffers {
  texture: WebGLTexture;
  relief: WebGLTexture;
  vao: WebGLVertexArrayObject;
  positions: WebGLBuffer;
  positionData: Float32Array;
  frames: WebGLBuffer;
  frameData: Float32Array;
  count: number;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Shader creation failed');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed');
  }
  return shader;
}

function linearTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export class MeshRenderer {
  readonly canvas = new OffscreenCanvas(1, 1);
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly uniforms: Record<UniformName, WebGLUniformLocation | null>;
  private readonly sceneTexture: WebGLTexture;
  private readonly meshes = new WeakMap<Garment, MeshBuffers>();

  constructor() {
    const gl = this.canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: true });
    if (!gl) {
      throw new Error('WebGL2 is not available');
    }
    this.gl = gl;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed');
    }
    this.program = program;
    this.uniforms = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<
      UniformName,
      WebGLUniformLocation | null
    >;
    gl.activeTexture(gl.TEXTURE2);
    this.sceneTexture = linearTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    gl.useProgram(program);
    gl.uniform1i(this.uniforms.garment, 0);
    gl.uniform1i(this.uniforms.relief, 1);
    gl.uniform1i(this.uniforms.scene, 2);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  begin(width: number, height: number, scene: OffscreenCanvas | null, lighting: Lighting, shade: Shade) {
    const { gl, uniforms } = this;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    if (scene) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
    }
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.exposure, lighting.exposure);
    gl.uniform2f(uniforms.levels, lighting.black, lighting.white);
    gl.uniform3fv(uniforms.tint, lighting.tint);
    gl.uniform3fv(uniforms.light, lighting.light);
    gl.uniform1f(uniforms.grain, lighting.grain);
    gl.uniform1f(uniforms.seed, lighting.seed);
    gl.uniform1f(uniforms.shading, SHADING);
    gl.uniform1f(uniforms.occlusion, OCCLUSION);
    gl.uniform1f(uniforms.lightWrap, scene ? LIGHT_WRAP : 0);
    gl.uniform1f(uniforms.softness, SOFTNESS);
    gl.uniform4fv(uniforms.neck, shade.neck);
    gl.uniform1f(uniforms.neckStrength, shade.neckStrength);
  }

  draw(garment: Garment, bones: DOMMatrix[], fit: Fit | null, opacity: number) {
    const { gl, uniforms } = this;
    const mesh = this.meshFor(garment);
    deform(garment.skin, bones, mesh.positionData, fit);
    surfaceFrames(mesh.positionData, mesh.frameData);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.positionData);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.frames);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.frameData);
    const scale = Math.hypot(bones[0].a, bones[0].b);
    gl.uniform1f(uniforms.opacity, opacity);
    gl.uniform1f(uniforms.reliefPixels, garment.relief.radius * scale);
    gl.uniform2f(uniforms.reliefTexel, 1 / garment.relief.width, 1 / garment.relief.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, mesh.relief);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private meshFor(garment: Garment): MeshBuffers {
    const cached = this.meshes.get(garment);
    if (cached) {
      return cached;
    }
    const { gl, program } = this;
    const { image, skin, relief: shape } = garment;
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.activeTexture(gl.TEXTURE1);
    const relief = linearTexture(gl);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, shape.width, shape.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, shape.data);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const positionData = new Float32Array(skin.rest.length);
    const positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, positionData.byteLength, gl.DYNAMIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const frameData = new Float32Array((skin.rest.length / 2) * 4);
    const frames = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, frames);
    gl.bufferData(gl.ARRAY_BUFFER, frameData.byteLength, gl.DYNAMIC_DRAW);
    const frameLocation = gl.getAttribLocation(program, 'surfaceFrame');
    gl.enableVertexAttribArray(frameLocation);
    gl.vertexAttribPointer(frameLocation, 4, gl.FLOAT, false, 0, 0);

    const uvs = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvs);
    gl.bufferData(gl.ARRAY_BUFFER, skin.uv, gl.STATIC_DRAW);
    const uvLocation = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

    const indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, skin.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    const mesh = { texture, relief, vao, positions, positionData, frames, frameData, count: skin.indices.length };
    this.meshes.set(garment, mesh);
    return mesh;
  }
}
