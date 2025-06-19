// declares .wgsl imports as strings
declare module "*.wgsl" {
    const value: string;
    export default value;
}
