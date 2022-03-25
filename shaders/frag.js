const frag = `
    precision highp float;

    uniform vec2 resolution;
    uniform float time;

    void main() {
        gl_FragColor = vec4(gl_FragCoord.xy / resolution, (sin(time) + 1.0) / 2.0, 1);
    }
`;
