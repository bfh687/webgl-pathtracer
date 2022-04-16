const render_frag = `
  precision highp float;
  
  varying vec2 textCoord;
  uniform sampler2D texture;

  const float EXPOSURE = 0.5;

  vec3 less_than(vec3 vec, float value) {
    return vec3((vec.x < value) ? 1.0 : 0.0, (vec.y < value) ? 1.0 : 0.0, (vec.z < value) ? 1.0 : 0.0);
  }

  vec3 linear_to_srgb(vec3 rgb) {
      rgb = clamp(rgb, 0.0, 1.0);
      return mix(pow(rgb, vec3(1.0 / 2.4)) * 1.055 - 0.055, rgb * 12.92, less_than(rgb, 0.0031308));
  }
  
  vec3 srgb_to_linear(vec3 rgb) {
      rgb = clamp(rgb, 0.0, 1.0);
      return mix(pow(((rgb + 0.055) / 1.055), vec3(2.4)), rgb / 12.92, less_than(rgb, 0.04045));
  }

  vec3 aces_film(vec3 vec) {
      float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((vec * (a * vec + b)) / (vec * (c * vec + d) + e), 0.0, 1.0);
  }

  void main(){
    vec3 color = vec3(texture2D(texture, textCoord).rgb);

    // apply exposure to color
    color *= EXPOSURE;

    // convert unbounded HDR color range to SDR color range
    color = aces_film(color);
    
    // convert to sRGB from linear
    color = linear_to_srgb(color);

    gl_FragColor = vec4(color, 1.0);
  }
`;
