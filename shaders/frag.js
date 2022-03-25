const frag = `#version 300 es
    precision highp float;

    uniform vec2 resolution;
    uniform float time;
    uniform int frame;

    const int MAX_BOUNCES = 8;
    const int RENDERS_PER_FRAME = 16;

    const float NUDGE_DIST = 0.01;
    const float MAX_DIST = 10000.0;
    const float MIN_DIST = 0.1;
    const float PI = 3.14159265359;

    struct Material {
        vec3 albedo;
        vec3 emissive;
        vec3 specular_color;
        float specular;
        float roughness;
    };

    struct Sphere {
        vec3 origin;
        float radius;
        Material mat;
    };

    struct Quad {
        vec3 vert1;
        vec3 vert2;
        vec3 vert3;
        vec3 vert4;
        Material mat;
    };

    struct Ray {
        vec3 origin;
        vec3 dir;
    };

    struct HitInfo {
        float dist;
        vec3 normal;
        Material mat;
    };

    void update_hit_info(out HitInfo hit_info, in float dist, in vec3 normal, in Material mat) {
        hit_info.dist = dist;
        hit_info.normal = normal;
        hit_info.mat = mat;
    }

    uint hash(inout uint seed) {
        seed = uint(seed ^ uint(61)) ^ uint(seed >> uint(16));
        seed *= uint(9);
        seed = seed ^ (seed >> 4);
        seed *= uint(0x27d4eb2d);
        seed = seed ^ (seed >> 15);
        return seed;
    }
    
    float rand_float(inout uint seed) {
        return float(hash(seed)) / 4294967296.0;
    }
    
    vec3 rand_vector(inout uint seed) {
        float z = rand_float(seed) * 2.0 - 1.0;
        float a = rand_float(seed) * 2.0 * PI;
        float r = sqrt(1.0 - z * z);
        float x = r * cos(a);
        float y = r * sin(a);
        return vec3(x, y, z);
    }

    float scalar_triple(vec3 u, vec3 v, vec3 w) {
        return dot(cross(u, v), w);
    }

    vec3 point_at(in Ray ray, in float dist) {
        return ray.origin + ray.dir.xyz * dist;
    }

    bool intersect_sphere(in Ray ray, in Sphere sphere, out HitInfo hit_info) {
        vec3 to_ray = ray.origin.xyz - sphere.origin.xyz;
        float a = dot(ray.dir, ray.dir);
        float b = 2.0 * dot(ray.dir, to_ray);
        float c = dot(to_ray, to_ray) - sphere.radius * sphere.radius;
        float d = b * b - 4.0 * a * c;
        
        if (d >= 0.0) {
            float dist = (-b - sqrt(d)) / (2.0 * a);
            if (dist > 0.0 && dist < hit_info.dist) {
                vec3 normal = normalize(point_at(ray, dist) - sphere.origin);
                update_hit_info(hit_info, dist, normal, sphere.mat);
                return true;
            }
        }
        return false;
    }

    bool intersect_quad(in Ray ray, in Quad quad, out HitInfo hit_info) {

        vec3 a = quad.vert1;
        vec3 b = quad.vert2;
        vec3 c = quad.vert3;
        vec3 d = quad.vert4;

        vec3 normal = normalize(cross(c-a, c-b));
        if (dot(normal, ray.dir) > 0.0) {
            normal *= -1.0;
            
            vec3 temp = d;
            d = a;
            a = temp;
            
            temp = b;
            b = c;
            c = temp;
        }
        
        vec3 p = ray.origin;
        vec3 q = ray.origin + ray.dir;
        vec3 pq = q - p;
        vec3 pa = a - p;
        vec3 pb = b - p;
        vec3 pc = c - p;
        
        vec3 m = cross(pc, pq);
        float v = dot(pa, m);
        vec3 intersect_pos;
        if (v >= 0.0) {
            float u = -dot(pb, m);
            if (u < 0.0) return false;
            float w = scalar_triple(pq, pb, pa);
            if (w < 0.0) return false;
            float denom = 1.0 / (u + v + w);
            u *= denom;
            v *= denom;
            w *= denom;
            intersect_pos = u * a + v * b + w * c;
        } else {
            vec3 pd = d - p;
            float u = dot(pd, m);
            if (u < 0.0) return false;
            float w = scalar_triple(pq, pa, pd);
            if (w < 0.0) return false;
            v = -v;
            float denom = 1.0 / (u + v + w);
            u *= denom;
            v *= denom;
            w *= denom;
            intersect_pos = u * a + v * d + w * c;
        }
        
        float dist;
        if (abs(ray.dir.x) > 0.1) {
            dist = (intersect_pos.x - ray.origin.x) / ray.dir.x;
        } else if (abs(ray.dir.y) > 0.1) {
            dist = (intersect_pos.y - ray.origin.y) / ray.dir.y;
        } else {
            dist = (intersect_pos.z - ray.origin.z) / ray.dir.z;
        }
        
        if (dist > 0.0 && dist < hit_info.dist) {
            update_hit_info(hit_info, dist, normal, quad.mat);
            return true;
        }    
        
        return false;
    }

    vec3 raytrace(in Ray ray, inout uint seed) {

        // initialize color and ray info
        vec3 color = vec3(0.0, 0.0, 0.0);
        vec3 throughput = vec3(1.0, 1.0, 1.0);
        
        vec3 ray_origin = ray.origin;
        vec3 ray_dir = ray.dir;
        
        // initialize scene (spheres and their materials)
        Material light_material = Material(vec3(0.0, 0.0, 0.0), vec3(1.0, 0.9, 0.7) * 25.0, vec3(0.0), 0.0, 0.0);    
        Quad light = Quad(vec3(-0.6, 1.28, 3.0), vec3(0.6, 1.28, 3.0), vec3(0.6, 1.28, 3.7), vec3(-0.6, 1.28, 3.7), light_material);

        // initialize walls and their materials
        Material wall_material = Material(vec3(0.7, 0.7, 0.7), vec3(0.0, 0.0, 0.0), vec3(0.0), 0.0, 0.0);
        Material red_material = Material(vec3(0.7, 0.1, 0.1), vec3(0.0, 0.0, 0.0), vec3(0.0), 0.0, 0.0);
        Material green_material = Material(vec3(0.1, 0.7, 0.1), vec3(0.0, 0.0, 0.0), vec3(0.0), 0.0, 0.0);
        
        Quad back_wall = Quad(vec3(-1.3, -1.3, 4.0), vec3(1.3, -1.3, 4.0), vec3(1.3, 1.3, 4.0), vec3(-1.3, 1.3, 4.0), wall_material);
        Quad ceiling = Quad(vec3(-1.3, 1.3, 4.0), vec3(1.3, 1.3, 4.0), vec3(1.3, 1.3, 2.7), vec3(-1.3, 1.3, 2.7), wall_material);
        Quad floor = Quad(vec3(-1.3, -1.3, 4.0), vec3(1.3, -1.3, 4.0), vec3(1.3, -1.3, 2.7), vec3(-1.3, -1.3, 2.7), wall_material);

        Quad left_wall = Quad(vec3(-1.3, -1.31, 4.0), vec3(-1.3, -1.31, 2.7), vec3(-1.3, 1.31, 2.7), vec3(-1.3, 1.31, 4.0), red_material);
        Quad right_wall = Quad(vec3(1.3, -1.31, 4.0), vec3(1.3, -1.31, 2.7), vec3(1.3, 1.31, 2.7), vec3(1.3, 1.31, 4.0), green_material);

        // intialize spheres and their materials
        Material material1 = Material(vec3(0.9, 0.9, 0.5), vec3(0.0, 0.0, 0.0), vec3(1.0), 1.0, 0.5);
        Sphere sphere1 = Sphere(vec3(-0.9, 0.0, 3.35), 0.3, material1);
        
        Material material2 = Material(vec3(0.9, 0.5, 0.9), vec3(0.0, 0.0, 0.0), vec3(1.0), 1.0, 0.5);
        Sphere sphere2 = Sphere(vec3(0.9, 0.0, 3.35), 0.3, material2);
        
        Material material3 = Material(vec3(0.5, 0.9, 0.9), vec3(0.0, 0.0, 0.0), vec3(1.0), 1.0, 0.7);
        Sphere sphere3 = Sphere(vec3(0.0, 0, 3.35), 0.4, material3);
        
        for (int i = 0; i < MAX_BOUNCES; i++) {
            
            // create / update ray variable for bounces
            Ray ray = Ray(ray_origin, ray_dir);
            
            // init hit info variable and default distance value
            HitInfo hit_info;
            hit_info.dist = MAX_DIST;
            
            // intersection with light
            intersect_quad(ray, light, hit_info);
            
            // intersetions with walls
            intersect_quad(ray, back_wall, hit_info);
            intersect_quad(ray, ceiling, hit_info);
            intersect_quad(ray, floor, hit_info);
            
            intersect_quad(ray, left_wall, hit_info);
            intersect_quad(ray, right_wall, hit_info);
            
            // intersections with spheres
            //intersect_sphere(ray, sphere1, hit_info);
            //intersect_sphere(ray, sphere2, hit_info);
            intersect_sphere(ray, sphere3, hit_info);

            // if ray missed, break early
            if (hit_info.dist == MAX_DIST) {
                break;
            }
            
            // update ray position and calculate new ray direction
            ray_origin = point_at(ray, hit_info.dist) + hit_info.normal * NUDGE_DIST;
            
            float specular = (rand_float(seed) < hit_info.mat.specular) ? 1.0 : 0.0;
            vec3 diffuse_ray_dir = normalize(hit_info.normal.xyz + rand_vector(seed).xyz);
            vec3 specular_ray_dir = reflect(ray_dir, hit_info.normal);
            specular_ray_dir = normalize(mix(specular_ray_dir, diffuse_ray_dir, hit_info.mat.roughness * hit_info.mat.roughness));
            
            ray_dir = mix(diffuse_ray_dir, specular_ray_dir, specular);
            
            // update color
            color += hit_info.mat.emissive * throughput;
            
            // update the color multiplier
            throughput *= mix(hit_info.mat.albedo, hit_info.mat.specular_color, specular);
        }
        return color;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        // random seed
        uint seed = uint(uint(fragCoord.x) * uint(1973) + uint(fragCoord.y) * uint(9277) + uint(frame) * uint(26699));

        // normalized pixel coordinates (from 0 to 1)
        vec2 uv = fragCoord/resolution.xy;

        // create horizontal and vertical vectors
        float aspect_ratio = resolution.x / resolution.y;
        vec3 horiz = vec3(1.0 * aspect_ratio, 0.0, 0.0);
        vec3 vert = vec3(0.0, 1.0, 0.0);
        
        // calculate ray direction
        vec3 look_from = vec3(0.0, 0.0, 0.0);
        vec3 dir = vec3(-1.0 * horiz.x / 2.0 + horiz.x * uv.x, -1.0 * vert.y / 2.0 + vert.y * uv.y, 1.0);
        Ray ray = Ray(look_from, dir);

        // raytrace to find color of the current ray
        vec3 color = vec3(0.0);
        for (int i = 0; i < RENDERS_PER_FRAME; i++) {
            color += raytrace(ray, seed) / float(RENDERS_PER_FRAME);
        }
        
        // check for shader reset
        // bool space = (texture(iChannel2, vec2(32.5 / 256.0, 0.25)).x > 0.1);
        
        // average passes together
        // vec4 last_color = texture(iChannel0, fragCoord / resolution.xy);
        // float blend = (last_color.a == 0.0 || space) ? 1.0 : 1.0 / (1.0 + (1.0 / last_color.a));
        // color = mix(last_color.rgb, color, blend);
        
        // set final pixel color
        fragColor = vec4(color, 1.0);
    }

    out vec4 fragColor;
    void main() {
        mainImage(fragColor, gl_FragCoord.xy);
    }
`;
