import { deform, type Skin } from './skin';

const VERTEX_SHADER = `#version 300 es
in vec2 position;
in vec2 uv;
uniform vec2 resolution;
out vec2 textureUv;
void main() {
  vec2 clip = position / resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  textureUv = uv;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec2 textureUv;
uniform sampler2D garment;
uniform float opacity;
uniform float brightness;
out vec4 color;
void main() {
  vec4 texel = texture(garment, textureUv);
  color = vec4(texel.rgb * brightness, texel.a) * opacity;
}`;

interface MeshBuffers {
  texture: WebGLTexture;
  vao: WebGLVertexArrayObject;
  positions: WebGLBuffer;
  positionData: Float32Array;
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

export class MeshRenderer {
  readonly canvas = new OffscreenCanvas(1, 1);
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly uniforms: {
    resolution: WebGLUniformLocation | null;
    opacity: WebGLUniformLocation | null;
    brightness: WebGLUniformLocation | null;
  };
  private readonly meshes = new WeakMap<Skin, MeshBuffers>();

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
    this.uniforms = {
      resolution: gl.getUniformLocation(program, 'resolution'),
      opacity: gl.getUniformLocation(program, 'opacity'),
      brightness: gl.getUniformLocation(program, 'brightness'),
    };
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  begin(width: number, height: number) {
    const { gl } = this;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.resolution, width, height);
  }

  draw(image: ImageBitmap, skin: Skin, bones: DOMMatrix[], opacity: number, brightness: number) {
    const { gl } = this;
    const mesh = this.meshFor(image, skin);
    deform(skin, bones, mesh.positionData);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.positionData);
    gl.uniform1f(this.uniforms.opacity, opacity);
    gl.uniform1f(this.uniforms.brightness, brightness);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private meshFor(image: ImageBitmap, skin: Skin): MeshBuffers {
    const cached = this.meshes.get(skin);
    if (cached) {
      return cached;
    }
    const { gl, program } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const positionData = new Float32Array(skin.rest.length);
    const positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, positionData.byteLength, gl.DYNAMIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

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

    const mesh = { texture, vao, positions, positionData, count: skin.indices.length };
    this.meshes.set(skin, mesh);
    return mesh;
  }
}
