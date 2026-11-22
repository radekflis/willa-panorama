"use client";

import React, { useEffect, useRef } from "react";

export function BiomimeticLiquidLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vsSrc = `
      attribute vec2 aPos;
      void main() {
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const fsSrc = `
      precision mediump float;
      uniform vec2 uRes;
      uniform float uTime;
      void main() {
        vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
        float waveA = sin(uv.x * 2.8 + uTime * 0.32) * cos(uv.y * 2.4 - uTime * 0.25);
        float waveB = sin((uv.x * 1.7 - uv.y * 2.1) + uTime * 0.2);
        float mixAmt = clamp(0.5 + 0.24 * waveA + 0.14 * waveB, 0.0, 1.0);
        vec3 baseStone = vec3(0.953, 0.945, 0.925);
        vec3 warmClay = vec3(0.788, 0.451, 0.306);
        vec3 pineShade = vec3(0.110, 0.169, 0.137);
        vec3 color = mix(baseStone, warmClay, mixAmt * 0.13);
        color = mix(color, pineShade, smoothstep(0.62, 1.0, waveA * waveB) * 0.06);
        gl_FragColor = vec4(color, 0.36);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");

    let rafId = 0;
    const start = performance.now();

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const renderFrame = (now: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(renderFrame);
    };
    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full opacity-80" />
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-60"
      >
        <defs>
          <radialGradient id="lbfBlobOne" cx="30%" cy="30%" r="58%">
            <stop offset="0%" stopColor="#C9734E" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#C9734E" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lbfBlobTwo" cx="72%" cy="62%" r="62%">
            <stop offset="0%" stopColor="#1C2B23" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#1C2B23" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path fill="url(#lbfBlobOne)">
          <animate
            attributeName="d"
            dur="19s"
            repeatCount="indefinite"
            values="
              M240,180 C440,50 760,80 920,250 C1080,420 910,720 620,750 C330,780 110,570 140,360 C160,255 190,215 240,180 Z;
              M350,130 C610,70 950,170 1010,390 C1070,610 810,790 520,760 C230,730 110,510 170,300 C205,195 270,155 350,130 Z;
              M240,180 C440,50 760,80 920,250 C1080,420 910,720 620,750 C330,780 110,570 140,360 C160,255 190,215 240,180 Z
            "
          />
        </path>
        <path fill="url(#lbfBlobTwo)">
          <animate
            attributeName="d"
            dur="24s"
            repeatCount="indefinite"
            values="
              M900,240 C1120,260 1280,460 1210,670 C1140,880 840,860 660,710 C480,560 550,310 720,245 C785,220 840,235 900,240 Z;
              M810,285 C1030,205 1250,350 1240,580 C1230,810 950,900 720,780 C490,660 490,410 650,315 C705,282 755,300 810,285 Z;
              M900,240 C1120,260 1280,460 1210,670 C1140,880 840,860 660,710 C480,560 550,310 720,245 C785,220 840,235 900,240 Z
            "
          />
        </path>
      </svg>
    </div>
  );
}
