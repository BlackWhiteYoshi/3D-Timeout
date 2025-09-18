struct Vertex {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) texturePosition: vec2<f32>
}

struct Fragment {
    @builtin(position) position: vec4<f32>,
    @location(0) localPosition: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) texturePosition: vec2<f32>
}

struct BackgroundFragment {
    @builtin(position) position: vec4<f32>,
    @location(0) yPosition: f32,
    @location(1) normal: vec3<f32>,
    @location(2) texturePosition: vec2<f32>
}


struct Tranformation {
    view: mat4x4<f32>,
    projection: mat4x4<f32>
}


@group(0) @binding(0) var theTexture: texture_2d<f32>;
@group(0) @binding(1) var theSampler: sampler;

@group(0) @binding(2) var<storage, read> modelBuffer: array<mat4x4<f32>>;

@group(0) @binding(3) var<uniform> tranformation: Tranformation;
@group(0) @binding(4) var<uniform> brightness: f32;
@group(0) @binding(5) var<uniform> colorRotate: f32;
@group(0) @binding(6) var<uniform> lightDirection: vec3<f32>;


@vertex
fn vertex_main(@builtin(instance_index) index: u32, vertex: Vertex) -> Fragment {
    var result: Fragment;

    result.localPosition = vertex.position;
    result.normal = vertex.normal;
    result.texturePosition = vertex.texturePosition;
    result.position = tranformation.projection * tranformation.view * modelBuffer[index] * vec4(vertex.position, 1.0);

    return result;
}

@fragment
fn fragment_main(fragment: Fragment) -> @location(0) vec4<f32> {
    // hsv color

    let MIN: f32 = 1.0;
    let MAX: f32 = 3.0;
    let SPAN: f32 = MAX - MIN;
    let squareDistance: f32 = fragment.localPosition.x * fragment.localPosition.x + fragment.localPosition.y * fragment.localPosition.y + fragment.localPosition.z * fragment.localPosition.z;

    var h: f32 = ((squareDistance - MIN) / SPAN + colorRotate);
    if (h > 1.0) { h -= 1.0; }
    let s: f32 = 1.0;
    let v: f32 = brightness;

    let hsvColor: vec3<f32> = hsv2rgb(vec3<f32>(h, s, v));


    // texture

    let TEXTURE_OPACITY: f32 = 0.5;
    let textureColor: vec4<f32> = textureSample(theTexture, theSampler, fragment.texturePosition);
    let opacity: f32 = TEXTURE_OPACITY * textureColor.a;


    // Phong

    let AMBIENT: f32 = 0.5;
    let DIFFUSE: f32 = 2.0;
    let SPECULAR: f32 = 4.0;
    let SPECULAR_SHININESS: f32 = 64.0;

    let ambient: f32 = AMBIENT;

    let diffuseAngle: f32 = max(dot(fragment.normal, lightDirection), 0.0);
    let diffuse: f32 = diffuseAngle * DIFFUSE;

    let viewDirection: vec3<f32> = mat3x3<f32>(tranformation.view[0].xyz, tranformation.view[1].xyz, tranformation.view[2].xyz) * vec3(0.0, 0.0, 1.0);
    let reflectDirection: vec3<f32> = reflect(-lightDirection, fragment.normal);
    let specularAngle: f32 = max(dot(viewDirection, reflectDirection), 0.0);
    let specular: f32 = pow(specularAngle, SPECULAR_SHININESS) * SPECULAR;

    let strength: f32 = ambient + diffuse + specular;


    let hsvPart: vec3<f32> = (1.0 - opacity) * hsvColor;
    let texturePart: vec3<f32> = opacity * textureColor.rgb;
    let color: vec3<f32> = (hsvPart + texturePart) * strength;
    return vec4(color, 1.0);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
    let k: vec4<f32> = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p: vec3<f32> = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}


@vertex
fn background_vertex_main(vertex: Vertex) -> BackgroundFragment {
    var result: BackgroundFragment;

    result.yPosition = vertex.position.y;
    result.normal = vertex.normal;
    result.texturePosition = vertex.texturePosition;

    let viewRotation = mat3x3<f32>(tranformation.view[0].xyz, tranformation.view[1].xyz, tranformation.view[2].xyz);
    let positionWithDepth = tranformation.projection * vec4(viewRotation * vertex.position, 1.0);
    result.position = positionWithDepth.xyww;

    return result;
}

@fragment
fn background_fragment_main(fragment: BackgroundFragment) -> @location(0) vec4<f32> {
    let textureColor: vec4<f32> = textureSample(theTexture, theSampler, fragment.texturePosition);

    let brightness: f32 = (fragment.yPosition + 6.0) / 8.0;
    let backgroundColor: vec3<f32> = vec3(brightness, brightness, 0.9);

    let filledColor: vec3<f32> = mix(backgroundColor, textureColor.rgb, textureColor.a);
    let tintedColor = mix(filledColor, backgroundColor, 0.8);


    // Phong

    let AMBIENT: f32 = 1.0;
    let DIFFUSE: f32 = 0.6;
    let SPECULAR: f32 = 1.0;
    let SPECULAR_SHININESS: f32 = 32.0;

    let ambient: f32 = AMBIENT;

    let diffuseAngle: f32 = max(dot(fragment.normal, lightDirection), 0.0);
    let diffuse: f32 = diffuseAngle * DIFFUSE;

    let viewDirection: vec3<f32> = mat3x3<f32>(tranformation.view[0].xyz, tranformation.view[1].xyz, tranformation.view[2].xyz) * vec3(0.0, 0.0, 1.0);
    let reflectDirection: vec3<f32> = reflect(-lightDirection, fragment.normal);
    let specularAngle: f32 = max(dot(viewDirection, reflectDirection), 0.0);
    let specular: f32 = pow(specularAngle, SPECULAR_SHININESS) * SPECULAR;

    let strength: f32 = ambient + diffuse + specular;


    let resultColor: vec3<f32> = tintedColor * strength;
    return vec4(resultColor, 1.0);
}
