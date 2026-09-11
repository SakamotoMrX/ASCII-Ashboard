//! Procedural 3D ASCII frame generators (Torus/Donut, Sphere, Cube, Planet, Black Hole).

use std::f32::consts::PI;

use super::charsets::unit_brightness_to_char;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProceduralScene {
    Donut,
    Sphere,
    Cube,
    Planet,
    BlackHole,
}

impl ProceduralScene {
    pub fn from_str_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "donut" | "torus" => Self::Donut,
            "sphere" => Self::Sphere,
            "cube" => Self::Cube,
            "planet" => Self::Planet,
            "blackhole" | "black_hole" => Self::BlackHole,
            _ => Self::Donut,
        }
    }
}

pub struct Procedural3DParams {
    pub scene: ProceduralScene,
    pub rotation_speed_x: f32,
    pub rotation_speed_y: f32,
    pub rotation_speed_z: f32,
    pub camera_distance: f32,
    pub field_of_view: f32,
    pub light_direction: [f32; 3],
    pub ambient_light: f32,
    pub specular_strength: f32,
}

impl Default for Procedural3DParams {
    fn default() -> Self {
        Self {
            scene: ProceduralScene::Donut,
            rotation_speed_x: 1.0,
            rotation_speed_y: 1.0,
            rotation_speed_z: 0.0,
            camera_distance: 5.0,
            field_of_view: 60.0,
            light_direction: [0.0, 1.0, -1.0],
            ambient_light: 0.2,
            specular_strength: 0.5,
        }
    }
}

/// Normalize a 3D vector.
fn normalize(v: [f32; 3]) -> [f32; 3] {
    let len = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
    if len < 1e-6 {
        [0.0, 0.0, 1.0]
    } else {
        [v[0] / len, v[1] / len, v[2] / len]
    }
}

/// Render a procedural 3D frame into an ASCII text string.
pub fn render_procedural_frame(
    params: &Procedural3DParams,
    frame_index: usize,
    width: usize,
    height: usize,
    ramp: &str,
) -> String {
    let ramp_chars: Vec<char> = ramp.chars().collect();
    if ramp_chars.is_empty() || width == 0 || height == 0 {
        return String::new();
    }

    match params.scene {
        ProceduralScene::Donut => render_donut(params, frame_index, width, height, &ramp_chars),
        ProceduralScene::Sphere => render_sphere(params, frame_index, width, height, &ramp_chars),
        ProceduralScene::Cube => render_cube(params, frame_index, width, height, &ramp_chars),
        ProceduralScene::Planet => render_planet(params, frame_index, width, height, &ramp_chars),
        ProceduralScene::BlackHole => render_blackhole(params, frame_index, width, height, &ramp_chars),
    }
}

fn buffer_to_string(buffer: &[Vec<char>]) -> String {
    let mut result = String::with_capacity(buffer.len() * (buffer[0].len() + 1));
    for (i, row) in buffer.iter().enumerate() {
        if i > 0 {
            result.push('\n');
        }
        for &ch in row {
            result.push(ch);
        }
    }
    result
}

// ---------------------------------------------------------------------------
// 1. Parametric Torus (Donut)
// ---------------------------------------------------------------------------
fn render_donut(
    params: &Procedural3DParams,
    frame_index: usize,
    width: usize,
    height: usize,
    ramp_chars: &[char],
) -> String {
    let angle_x = (frame_index as f32) * 0.04 * params.rotation_speed_x;
    let angle_z = (frame_index as f32) * 0.02 * (if params.rotation_speed_y != 0.0 { params.rotation_speed_y } else { 1.0 });

    let cos_a = angle_x.cos();
    let sin_a = angle_x.sin();
    let cos_b = angle_z.cos();
    let sin_b = angle_z.sin();

    let mut output = vec![vec![' '; width]; height];
    let mut zbuffer = vec![vec![0.0f32; width]; height];

    let scale_x = width as f32 * 0.375;
    let scale_y = height as f32 * (15.0 / 35.0);

    let mut theta = 0.0f32;
    while theta < 2.0 * PI {
        let cos_theta = theta.cos();
        let sin_theta = theta.sin();
        let circle_x = 2.0 + cos_theta;
        let circle_y = sin_theta;

        let mut phi = 0.0f32;
        while phi < 2.0 * PI {
            let cos_phi = phi.cos();
            let sin_phi = phi.sin();

            let x = circle_x * cos_phi;
            let y = circle_x * sin_phi;
            let z = circle_y;

            let y2 = y * cos_a - z * sin_a;
            let z2 = y * sin_a + z * cos_a;
            let x2 = x * cos_b - y2 * sin_b;
            let y3 = x * sin_b + y2 * cos_b;

            let distance = z2 + params.camera_distance;
            if distance > 0.0 {
                let inverse_depth = 1.0 / distance;
                let screen_x = (width as f32 / 2.0 + scale_x * inverse_depth * x2) as isize;
                let screen_y = (height as f32 / 2.0 + scale_y * inverse_depth * y3) as isize;

                if screen_x >= 0 && (screen_x as usize) < width && screen_y >= 0 && (screen_y as usize) < height {
                    let sx = screen_x as usize;
                    let sy = screen_y as usize;

                    let normal_x = cos_theta * cos_phi;
                    let normal_y = cos_theta * sin_phi;
                    let normal_z = sin_theta;

                    let normal_y2 = normal_y * cos_a - normal_z * sin_a;
                    let normal_z2 = normal_y * sin_a + normal_z * cos_a;
                    let normal_y3 = normal_x * sin_b + normal_y2 * cos_b;

                    let brightness = normal_y3 * 0.7 - normal_z2;

                    if brightness > 0.0 && inverse_depth > zbuffer[sy][sx] {
                        zbuffer[sy][sx] = inverse_depth;
                        output[sy][sx] = unit_brightness_to_char(brightness, ramp_chars);
                    }
                }
            }
            phi += 0.04;
        }
        theta += 0.07;
    }

    buffer_to_string(&output)
}

// ---------------------------------------------------------------------------
// 2. Lambertian Shaded Sphere
// ---------------------------------------------------------------------------
fn render_sphere(
    params: &Procedural3DParams,
    frame_index: usize,
    width: usize,
    height: usize,
    ramp_chars: &[char],
) -> String {
    let light = normalize(params.light_direction);
    let angle = (frame_index as f32) * 0.04 * params.rotation_speed_y;
    let cos_angle = angle.cos();
    let sin_angle = angle.sin();

    let mut output = vec![vec![' '; width]; height];

    for py in 0..height {
        let y = ((py as f32 - height as f32 / 2.0) / (height as f32 / 2.0)) / 0.5;
        for px in 0..width {
            let x = (px as f32 - width as f32 / 2.0) / (width as f32 / 2.0);
            let distance = x * x + y * y;
            if distance > 1.0 {
                continue;
            }

            let z = (1.0 - distance).sqrt();
            let rotated_x = x * cos_angle - z * sin_angle;
            let rotated_z = x * sin_angle + z * cos_angle;

            let diff = rotated_x * light[0] + y * light[1] + rotated_z * light[2];
            let brightness = diff.max(0.0) * (1.0 - params.ambient_light) + params.ambient_light;

            output[py][px] = unit_brightness_to_char(brightness.clamp(0.0, 1.0), ramp_chars);
        }
    }

    buffer_to_string(&output)
}

// ---------------------------------------------------------------------------
// 3. Lit 3D Cube with Barycentric Rasterizer
// ---------------------------------------------------------------------------
const CUBE_VERTICES: [[f32; 3]; 8] = [
    [-1.0, -1.0, -1.0],
    [ 1.0, -1.0, -1.0],
    [ 1.0,  1.0, -1.0],
    [-1.0,  1.0, -1.0],
    [-1.0, -1.0,  1.0],
    [ 1.0, -1.0,  1.0],
    [ 1.0,  1.0,  1.0],
    [-1.0,  1.0,  1.0],
];

const CUBE_FACES: [[usize; 4]; 6] = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [1, 2, 6, 5],
    [0, 4, 7, 3],
];

fn rotate_point(p: [f32; 3], ax: f32, ay: f32, az: f32) -> [f32; 3] {
    let (cx, sx) = (ax.cos(), ax.sin());
    let (cy, sy) = (ay.cos(), ay.sin());
    let (cz, sz) = (az.cos(), az.sin());

    let y1 = p[1] * cx - p[2] * sx;
    let z1 = p[1] * sx + p[2] * cx;

    let x2 = p[0] * cy + z1 * sy;
    let z2 = -p[0] * sy + z1 * cy;

    let x3 = x2 * cz - y1 * sz;
    let y3 = x2 * sz + y1 * cz;

    [x3, y3, z2]
}

fn face_normal(v0: [f32; 3], v1: [f32; 3], v2: [f32; 3]) -> [f32; 3] {
    let a = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    let b = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    let n = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
    normalize(n)
}

fn project_vertex(p: [f32; 3], width: usize, height: usize, cam_dist: f32) -> Option<[f32; 3]> {
    let depth = p[2] + cam_dist;
    if depth <= 0.1 {
        return None;
    }
    let scale = (width as f32 * 0.32).min(height as f32 * 0.75);
    Some([
        width as f32 / 2.0 + p[0] * scale / depth,
        height as f32 / 2.0 - p[1] * scale * 0.5 / depth,
        depth,
    ])
}

fn barycentric(px: f32, py: f32, a: [f32; 3], b: [f32; 3], c: [f32; 3]) -> Option<[f32; 3]> {
    let denom = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if denom.abs() < 1e-6 {
        return None;
    }
    let w1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / denom;
    let w2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / denom;
    let w3 = 1.0 - w1 - w2;

    if w1 < -1e-4 || w2 < -1e-4 || w3 < -1e-4 {
        None
    } else {
        Some([w1, w2, w3])
    }
}

fn render_cube(
    params: &Procedural3DParams,
    frame_index: usize,
    width: usize,
    height: usize,
    ramp_chars: &[char],
) -> String {
    let ax = frame_index as f32 * 0.035 * params.rotation_speed_x;
    let ay = frame_index as f32 * 0.045 * params.rotation_speed_y;
    let az = frame_index as f32 * 0.015 * params.rotation_speed_z;

    let light = normalize(params.light_direction);
    let cam_dist = params.camera_distance.max(2.0);

    let transformed: Vec<[f32; 3]> = CUBE_VERTICES.iter().map(|&v| rotate_point(v, ax, ay, az)).collect();
    let projected: Vec<Option<[f32; 3]>> = transformed.iter().map(|&v| project_vertex(v, width, height, cam_dist)).collect();

    let mut output = vec![vec![' '; width]; height];
    let mut zbuffer = vec![vec![f32::INFINITY; width]; height];
    let camera_pos = [0.0f32, 0.0, -cam_dist];

    for face in CUBE_FACES.iter() {
        let v0 = transformed[face[0]];
        let v1 = transformed[face[1]];
        let v2 = transformed[face[2]];
        let v3 = transformed[face[3]];

        let norm = face_normal(v0, v1, v2);
        let center = [
            (v0[0] + v1[0] + v2[0] + v3[0]) * 0.25,
            (v0[1] + v1[1] + v2[1] + v3[1]) * 0.25,
            (v0[2] + v1[2] + v2[2] + v3[2]) * 0.25,
        ];
        let view_vec = [camera_pos[0] - center[0], camera_pos[1] - center[1], camera_pos[2] - center[2]];

        // Backface culling
        if norm[0] * view_vec[0] + norm[1] * view_vec[1] + norm[2] * view_vec[2] <= 0.0 {
            continue;
        }

        let dot = norm[0] * light[0] + norm[1] * light[1] + norm[2] * light[2];
        let brightness = dot.clamp(0.12, 1.0);
        let ch = unit_brightness_to_char(brightness, ramp_chars);

        let p0 = projected[face[0]];
        let p1 = projected[face[1]];
        let p2 = projected[face[2]];
        let p3 = projected[face[3]];

        if let (Some(pt0), Some(pt1), Some(pt2), Some(pt3)) = (p0, p1, p2, p3) {
            let triangles = [(pt0, pt1, pt2), (pt0, pt2, pt3)];
            for (t0, t1, t2) in triangles {
                let min_x = (t0[0].min(t1[0]).min(t2[0]).floor() as isize).max(0).min(width as isize - 1) as usize;
                let max_x = (t0[0].max(t1[0]).max(t2[0]).ceil() as isize).max(0).min(width as isize - 1) as usize;
                let min_y = (t0[1].min(t1[1]).min(t2[1]).floor() as isize).max(0).min(height as isize - 1) as usize;
                let max_y = (t0[1].max(t1[1]).max(t2[1]).ceil() as isize).max(0).min(height as isize - 1) as usize;

                for py in min_y..=max_y {
                    for px in min_x..=max_x {
                        if let Some(w) = barycentric(px as f32 + 0.5, py as f32 + 0.5, t0, t1, t2) {
                            let depth = w[0] * t0[2] + w[1] * t1[2] + w[2] * t2[2];
                            if depth < zbuffer[py][px] {
                                zbuffer[py][px] = depth;
                                output[py][px] = ch;
                            }
                        }
                    }
                }
            }
        }
    }

    buffer_to_string(&output)
}

// ---------------------------------------------------------------------------
// 4. Rotating Planet with Surface Harmonics
// ---------------------------------------------------------------------------
fn surface_pattern(x: f32, y: f32, z: f32) -> f32 {
    let val = (x * 7.0).sin() + (y * 9.0).sin() + (z * 8.0).sin();
    val + ((x + y + z) * 14.0).sin() * 0.5
}

fn render_planet(
    params: &Procedural3DParams,
    frame_index: usize,
    width: usize,
    height: usize,
    ramp_chars: &[char],
) -> String {
    let light = normalize(params.light_direction);
    let angle = (frame_index as f32) * 0.035 * params.rotation_speed_y;
    let cos_angle = angle.cos();
    let sin_angle = angle.sin();

    let mut output = vec![vec![' '; width]; height];

    for py in 0..height {
        let screen_y = ((py as f32 - height as f32 / 2.0) / (height as f32 / 2.0)) * 2.0;
        for px in 0..width {
            let screen_x = (px as f32 - width as f32 / 2.0) / (width as f32 / 2.0);
            let radius_squared = screen_x * screen_x + screen_y * screen_y;
            if radius_squared > 1.0 {
                continue;
            }

            let screen_z = (1.0 - radius_squared).sqrt();
            let x = screen_x * cos_angle + screen_z * sin_angle;
            let z = -screen_x * sin_angle + screen_z * cos_angle;
            let y = screen_y;

            let mut brightness = x * light[0] + y * light[1] + z * light[2];
            if surface_pattern(x, y, z) > 0.8 {
                brightness += 0.15;
            }
            if brightness < 0.0 {
                brightness *= 0.15;
            }

            let edge = 1.0 - screen_z;
            if edge > 0.82 {
                brightness += (edge - 0.82) * 1.5;
            }

            output[py][px] = unit_brightness_to_char(brightness.clamp(0.0, 1.0), ramp_chars);
        }
    }

    buffer_to_string(&output)
}

// ---------------------------------------------------------------------------
// 5. Black Hole with Gravitational Lensing & Relativistic Accretion Disk
// ---------------------------------------------------------------------------
const BLACK_HOLE_RADIUS: f32 = 0.42;
const DISK_INNER: f32 = 0.52;
const DISK_OUTER: f32 = 1.55;

fn render_blackhole(
    params: &Procedural3DParams,
    frame_index: usize,
    width: usize,
    height: usize,
    ramp_chars: &[char],
) -> String {
    let angle = (frame_index as f32) * 0.045 * params.rotation_speed_y;
    let mut brightness_buffer = vec![vec![0.0f32; width]; height];

    // Seeded starfield simulation
    for i in 0..120 {
        let sx = ((i * 1013 % 1000) as f32 / 500.0) - 1.0;
        let sy = ((i * 3011 % 1000) as f32 / 500.0) - 1.0;
        let star_bright = ((i * 7919 % 1000) as f32 / 1000.0) * 0.4;

        let px = ((width as f32 / 2.0) + sx * (width as f32 / 2.0)) as isize;
        let py = ((height as f32 / 2.0) + sy * (height as f32 / 2.0)) as isize;

        if px >= 0 && (px as usize) < width && py >= 0 && (py as usize) < height {
            brightness_buffer[py as usize][px as usize] = star_bright;
        }
    }

    let mut output = vec![vec![' '; width]; height];

    for py in 0..height {
        let y = ((py as f32 - height as f32 / 2.0) / (height as f32 / 2.0)) * 2.0;
        for px in 0..width {
            let x = (px as f32 - width as f32 / 2.0) / (width as f32 / 2.0);
            let radius = (x * x + y * y).sqrt();
            let mut intensity = brightness_buffer[py][px];

            if radius > DISK_INNER && radius < DISK_OUTER {
                let theta = y.atan2(x);
                let spiral = (((theta + angle) * 8.0 + radius * 12.0).sin() + 1.0) / 2.0;
                let distance_factor = (1.0 - (radius - 0.95).abs() / 0.63).max(0.0);
                let mut disk = spiral * distance_factor;
                disk += (-(radius - DISK_INNER) * 10.0).exp() * 1.5;
                let doppler = 0.5 + 0.5 * theta.cos();
                disk *= 0.55 + doppler * 0.8;
                intensity = intensity.max(disk);
            }

            if radius < BLACK_HOLE_RADIUS {
                intensity = 0.0;
            } else if radius < DISK_OUTER {
                intensity += (BLACK_HOLE_RADIUS / radius) * 0.15;
            }

            let ring_distance = (radius - BLACK_HOLE_RADIUS).abs();
            intensity += (-ring_distance * 80.0).exp() * 1.5;

            output[py][px] = unit_brightness_to_char(intensity.clamp(0.0, 1.0), ramp_chars);
        }
    }

    buffer_to_string(&output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_procedural_scenes_generate_non_empty_output() {
        let ramp = " .:-=+*#%@";
        let scenes = [
            ProceduralScene::Donut,
            ProceduralScene::Sphere,
            ProceduralScene::Cube,
            ProceduralScene::Planet,
            ProceduralScene::BlackHole,
        ];

        for scene in scenes {
            let mut params = Procedural3DParams::default();
            params.scene = scene;
            let frame = render_procedural_frame(&params, 0, 80, 40, ramp);
            assert!(!frame.is_empty());
            let lines: Vec<&str> = frame.lines().collect();
            assert_eq!(lines.len(), 40, "Scene {:?} failed height count", scene);
            assert_eq!(lines[0].chars().count(), 80, "Scene {:?} failed width count", scene);
        }
    }
}
