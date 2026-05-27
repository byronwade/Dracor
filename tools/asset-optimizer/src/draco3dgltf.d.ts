declare module 'draco3dgltf' {
  interface DracoModule {}
  const draco3d: {
    createEncoderModule(): Promise<DracoModule>;
    createDecoderModule(): Promise<DracoModule>;
  };
  export default draco3d;
}
