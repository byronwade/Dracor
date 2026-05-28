import type { WeaponType } from "@dracor/shared";

export function buildProceduralWeapon(
  B: any, scene: any, parent: any, weapon: WeaponType, accentColor: [number, number, number]
): any {
  const S = 1; // weapon scale is applied by parent's transform / size targeting

  const weaponMat = new B.StandardMaterial(`pWeap_${weapon}`, scene);
  weaponMat.specularColor = new B.Color3(0.6, 0.6, 0.6);
  weaponMat.specularPower = 8;

  const darkMat = new B.StandardMaterial(`pDark_${weapon}`, scene);
  darkMat.diffuseColor = new B.Color3(0.08, 0.06, 0.05);

  const accentMat = new B.StandardMaterial(`pAcc_${weapon}`, scene);
  accentMat.diffuseColor = new B.Color3(...accentColor);
  accentMat.specularColor = new B.Color3(0.3, 0.28, 0.25);

  const root = new B.TransformNode(`pWeapRoot_${weapon}`, scene);
  root.parent = parent;

  if (weapon === "dagger") {
    weaponMat.diffuseColor = new B.Color3(0.65, 0.65, 0.7);
    const blade = B.MeshBuilder.CreateBox("blade", { width: 0.025 * S, height: 0.3 * S, depth: 0.006 * S }, scene);
    blade.position.y = 0.18 * S;
    blade.material = weaponMat; blade.parent = root;

    const guard = B.MeshBuilder.CreateBox("guard", { width: 0.10 * S, height: 0.012 * S, depth: 0.02 * S }, scene);
    guard.position.y = 0.02 * S;
    guard.material = accentMat; guard.parent = root;

    const grip = B.MeshBuilder.CreateCylinder("grip", { diameter: 0.022 * S, height: 0.07 * S, tessellation: 8 }, scene);
    grip.position.y = -0.02 * S;
    grip.material = darkMat; grip.parent = root;

    const pommel = B.MeshBuilder.CreateSphere("pommel", { diameter: 0.028 * S, segments: 8 }, scene);
    pommel.position.y = -0.06 * S;
    pommel.material = accentMat; pommel.parent = root;
    return root;
  }

  if (weapon === "arrows") {
    weaponMat.diffuseColor = new B.Color3(0.4, 0.3, 0.15);
    for (let i = 0; i < 3; i++) {
      const shaft = B.MeshBuilder.CreateCylinder(`arrow${i}`, { diameter: 0.01, height: 0.45, tessellation: 6 }, scene);
      shaft.position.set((i - 1) * 0.015, 0.22, 0);
      shaft.material = weaponMat; shaft.parent = root;

      const tip = B.MeshBuilder.CreateCylinder(`tip${i}`, { diameterTop: 0, diameterBottom: 0.015, height: 0.04, tessellation: 6 }, scene);
      tip.position.set((i - 1) * 0.015, 0.45, 0);
      tip.material = accentMat; tip.parent = root;
    }
    return root;
  }

  // Fallback rectangle for any other weapon type without a GLB
  const fallback = B.MeshBuilder.CreateBox("fallback", { width: 0.04, height: 0.5, depth: 0.04 }, scene);
  fallback.material = weaponMat;
  fallback.parent = root;
  return root;
}
