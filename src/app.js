import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { baseParts, keyboards, PRICE_DATE } from './data.js';
import { caseLayoutFor } from './layout.js';

const query = selector => document.querySelector(selector);
const queryAll = selector => [...document.querySelectorAll(selector)];
const euroFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const euro = value => euroFormatter.format(value);
const formatMm = value => `${Math.round(value * 10) / 10} mm`;
const partById = new Map(baseParts.map(part => [part.id, part]));

const canvas = query('#canvas');
if (!canvas) throw new Error('3D-Canvas wurde nicht gefunden.');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: matchMedia('(pointer: coarse)').matches ? 'default' : 'high-performance'
});
renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080d11);

const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 1600);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 45;
controls.maxDistance = 900;
controls.target.set(0, 10, 0);

const transformControls = new TransformControls(camera, canvas);
transformControls.setMode('translate');
transformControls.setSpace('world');
transformControls.setSize(0.82);
transformControls.setTranslationSnap(1);
transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
scene.add(transformControls.getHelper());

scene.add(new THREE.HemisphereLight(0xc9ecff, 0x16202a, 2.4));
const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(120, 180, 200);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
Object.assign(keyLight.shadow.camera, { left: -220, right: 220, top: 220, bottom: -220, near: 1, far: 700 });
scene.add(keyLight);

const rim = new THREE.DirectionalLight(0x52d3ff, 1.2);
rim.position.set(-160, 40, -100);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(360, 64),
  new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 1, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(600, 60, 0x2c6170, 0x172c34);
scene.add(grid);

const axes = new THREE.AxesHelper(38);
axes.material.transparent = true;
axes.material.opacity = 0.8;
scene.add(axes);

const root = new THREE.Group();
scene.add(root);

const selectionBox = new THREE.BoxHelper(undefined, 0x5ee7ff);
selectionBox.material.depthTest = false;
selectionBox.material.transparent = true;
selectionBox.material.opacity = 0.9;
selectionBox.renderOrder = 20;
selectionBox.visible = false;
scene.add(selectionBox);

const materials = {
  shell: new THREE.MeshPhysicalMaterial({ color: 0x26343d, roughness: 0.42, metalness: 0.18, clearcoat: 0.32 }),
  shellEdge: new THREE.MeshStandardMaterial({ color: 0x344955, roughness: 0.52, metalness: 0.12 }),
  pocket: new THREE.MeshStandardMaterial({ color: 0x176575, roughness: 0.48, metalness: 0.18 }),
  screen: new THREE.MeshPhysicalMaterial({ color: 0x102d3f, emissive: 0x0f8eb5, emissiveIntensity: 0.22, roughness: 0.18, metalness: 0.08, clearcoat: 1 }),
  pcb: new THREE.MeshStandardMaterial({ color: 0x155e46, roughness: 0.65 }),
  pcb2: new THREE.MeshStandardMaterial({ color: 0x234b79, roughness: 0.65 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd2a84a, metalness: 0.65, roughness: 0.35 }),
  black: new THREE.MeshStandardMaterial({ color: 0x080a0c, roughness: 0.48 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xa8b4bd, metalness: 0.72, roughness: 0.3 }),
  battery: new THREE.MeshStandardMaterial({ color: 0x8a3752, roughness: 0.55 }),
  batteryCap: new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.7, roughness: 0.25 }),
  switch: new THREE.MeshStandardMaterial({ color: 0xe3e8ed, roughness: 0.5 }),
  key: new THREE.MeshStandardMaterial({ color: 0x263844, roughness: 0.56, metalness: 0.08 }),
  antenna: new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.45 }),
  rj45: new THREE.MeshStandardMaterial({ color: 0x9aa9b4, metalness: 0.7, roughness: 0.25 })
};
const sharedMaterials = new Set(Object.values(materials));

const state = { keyboard: 'cardkb', mode: 'assembly', explode: 0, selected: null, transformMode: 'translate', snap: true, xray: false };
const objects = new Map();
const editTransforms = new Map();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let currentCase = caseLayoutFor(keyboards[0]);
let hasBuilt = false;
let renderQueued = true;
let renderRequest = 0;

function requestRender() {
  renderQueued = true;
  if (!renderRequest && !document.hidden) renderRequest = requestAnimationFrame(renderFrame);
}

function disposeObjectTree(object) {
  object.traverse(child => {
    child.geometry?.dispose();
    const childMaterials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
    for (const material of childMaterials) {
      if (sharedMaterials.has(material)) continue;
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.dispose();
      }
      material.dispose();
    }
  });
}

function clearRoot() {
  transformControls.detach();
  selectionBox.visible = false;
  for (const child of [...root.children]) {
    disposeObjectTree(child);
    root.remove(child);
  }
  objects.clear();
}

function box(name, size, position, material = materials.pcb, parent = root) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.name = name;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radius, length, position, rotation = [0, 0, 0], material = materials.metal, parent = root) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.userData.name = name;
  parent.add(mesh);
  return mesh;
}

function componentGroup(id, label, basePosition = [0, 0, 0]) {
  const group = new THREE.Group();
  const stored = editTransforms.get(`${state.keyboard}:${id}`);
  const editOffset = stored?.position?.clone() || new THREE.Vector3();
  const editRotation = stored?.rotation?.clone() || new THREE.Euler();
  group.userData = { id, componentId: id, label, basePosition: new THREE.Vector3(...basePosition), editOffset, editRotation };
  group.position.set(...basePosition).add(editOffset);
  group.rotation.copy(editRotation);
  root.add(group);
  objects.set(id, group);
  return group;
}

function addTextPlate(group, text, width = 24, height = 7, z = 4) {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext('2d');
  context.fillStyle = '#0c151d';
  context.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
  context.fillStyle = '#c9f4ff';
  context.font = '700 42px system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, labelCanvas.width / 2, labelCanvas.height / 2);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.z = z;
  mesh.userData.name = text;
  group.add(mesh);
}

function pcbWithPins(group, width, height, depth = 2) {
  box('pcb', [width, height, depth], [0, 0, 0], materials.pcb, group);
  for (let y = -height / 2 + 4; y < height / 2 - 2; y += 5) {
    for (const x of [-width / 2 + 2, width / 2 - 2]) {
      cylinder('pin', 0.55, 2.5, [x, y, depth / 2 + 1.2], [Math.PI / 2, 0, 0], materials.gold, group);
    }
  }
}

function buildShell(keyboard) {
  const size = caseLayoutFor(keyboard);
  currentCase = size;
  const group = componentGroup('shell', 'Gehäuse');
  const front = box('front panel', [size.w, size.h, 3], [0, 0, size.d / 2 - 1.5], materials.shell, group);
  const back = box('back panel', [size.w, size.h, 3], [0, 0, -size.d / 2 + 1.5], materials.shell, group);
  front.renderOrder = 2;
  back.renderOrder = 1;
  const wallThickness = 3;
  box('left wall', [wallThickness, size.h, size.d - 6], [-size.w / 2 + 1.5, 0, 0], materials.shellEdge, group);
  box('right wall', [wallThickness, size.h, size.d - 6], [size.w / 2 - 1.5, 0, 0], materials.shellEdge, group);
  box('top wall', [size.w - 6, wallThickness, size.d - 6], [0, size.h / 2 - 1.5, 0], materials.shellEdge, group);
  box('bottom wall', [size.w - 6, wallThickness, size.d - 6], [0, -size.h / 2 + 1.5, 0], materials.shellEdge, group);
  box('display bezel', [106, 66, 2], [0, size.displayY, size.d / 2 + 0.8], materials.black, group);
  box('keyboard faceplate', [size.pocket.w + 1.5, size.pocket.h + 1.5, 1.6], [0, size.keyboardY, size.faceplateCenterZ], materials.shellEdge, group);
}

function buildKeyboardPocket() {
  const { pocket } = currentCase;
  const group = componentGroup('keyboardPocket', 'Tastaturtasche hinten', [0, currentCase.keyboardY, 0]);
  box('pocket back', [pocket.w, pocket.h, pocket.wall], [0, 0, pocket.backZ], materials.pocket, group);
  box('pocket left rail', [pocket.wall, pocket.h, pocket.d], [-pocket.w / 2 + pocket.wall / 2, 0, pocket.centerZ], materials.pocket, group);
  box('pocket right rail', [pocket.wall, pocket.h, pocket.d], [pocket.w / 2 - pocket.wall / 2, 0, pocket.centerZ], materials.pocket, group);
  box('pocket top rail', [pocket.w - pocket.wall * 2, pocket.wall, pocket.d], [0, pocket.h / 2 - pocket.wall / 2, pocket.centerZ], materials.pocket, group);
  box('pocket bottom rail', [pocket.w - pocket.wall * 2, pocket.wall, pocket.d], [0, -pocket.h / 2 + pocket.wall / 2, pocket.centerZ], materials.pocket, group);
}

function buildDisplay() {
  const group = componentGroup('display', '3.5″ TFT', [0, currentCase.displayY, currentCase.d / 2 + 3.8]);
  box('display pcb', [98, 56.3, 2], [0, 0, 0], materials.pcb2, group);
  box('LCD', [84, 50, 3], [0, 0, 2.3], materials.screen, group);
  addTextPlate(group, '3.5″ TFT', 30, 7, 4.1);
  box('microSD slot', [18, 8, 3], [36, -24, 1.8], materials.metal, group);
}

function buildS3() {
  const group = componentGroup('s3', 'ESP32-S3', [currentCase.w / 2 - 17, 38, 0]);
  pcbWithPins(group, 25.4, 63, 2);
  box('S3 WROOM', [18, 25, 3], [0, 8, 2.4], materials.metal, group);
  box('USB-C', [9, 7, 4], [0, -28, 2.5], materials.metal, group);
  addTextPlate(group, 'S3', 15, 6, 4);
}

function buildC5() {
  const [width, height, depth] = partById.get('c5').dims;
  const group = componentGroup('c5', 'ESP32-C5', [currentCase.w / 2 - 17, -18, 0]);
  box('C5 carrier envelope', [22, height + 8, 1.6], [0, 0, -1.4], materials.pcb, group);
  box('C5 module', [width, height, depth], [0, 0, 1], materials.metal, group);
  addTextPlate(group, 'C5', 12, 5, 3);
  cylinder('U.FL', 1.5, 2, [7, height / 2 - 4, 3], [Math.PI / 2, 0, 0], materials.gold, group);
}

function buildW5500() {
  const group = componentGroup('w5500', 'W5500 Ethernet', [-currentCase.w / 2 + 15, 42, 0]);
  box('W5500 pcb', [23, 29, 2], [0, 0, -11], materials.pcb, group);
  box('RJ45', [21, 20, 22], [0, 3, 1], materials.rj45, group);
  addTextPlate(group, 'W5500', 18, 5, 12.2);
}

function buildBatteryShield() {
  const group = componentGroup('batteryShield', 'Dual 18650 Shield', [0, -20, -10]);
  box('power pcb', [49, 101, 2], [0, 0, 0], materials.pcb2, group);
  box('boost', [15, 12, 3], [0, 42, 2], materials.black, group);
  box('USB-C power', [10, 7, 4], [0, -46, 2.5], materials.metal, group);
}

function buildBatteries() {
  for (const [id, x] of [['batteryA', -12], ['batteryB', 12]]) {
    const group = componentGroup(id, id === 'batteryA' ? '18650 A' : '18650 B', [x, -20, 3]);
    cylinder('18650', 9.25, 65.3, [0, 0, 0], [0, 0, 0], materials.battery, group);
    cylinder('cap', 8.7, 1.2, [0, 32.05, 0], [0, 0, 0], materials.batteryCap, group);
    cylinder('cap', 8.7, 1.2, [0, -32.05, 0], [0, 0, 0], materials.batteryCap, group);
  }
}

function buildUSB() {
  const group = componentGroup('usbC', 'USB-C Breakout', [currentCase.w / 2 - 14, -currentCase.h / 2 + 16, 0]);
  box('USB board', [22, 22, 2], [0, 0, 0], materials.pcb, group);
  box('USB-C', [10, 8, 5], [0, -7, 2.5], materials.metal, group);
}

function buildAntennas() {
  const wifi = componentGroup('wifiAnt', 'WLAN Antenne', [currentCase.w / 2 + 8, currentCase.h / 2 - 34, 0]);
  cylinder('antenna', 4.75, 85, [0, 0, 0], [0, 0, 0], materials.antenna, wifi);
  const bluetooth = componentGroup('btAnt', 'BT/FPC Antenne', [-currentCase.w / 2 + 10, 0, -3]);
  box('FPC', [13, 95, 1], [0, 0, 0], materials.gold, bluetooth);
}

function buildNavigation() {
  const group = componentGroup('nav', '5× Kailh Choc Navigation', [0, currentCase.navY, currentCase.d / 2 + 6]);
  const positions = [[0, 12], [-12, 0], [0, 0], [12, 0], [0, -12]];
  for (const [x, y] of positions) {
    box('choc', [10, 10, 5], [x, y, 0], materials.switch, group);
    box('cap', [11.5, 11.5, 3], [x, y, 4], materials.key, group);
  }
}

function buildMicroSD() {
  const group = componentGroup('microsd', 'microSD 32GB', [-currentCase.w / 2 + 15, 10, 0]);
  box('microSD', [11, 15, 1], [0, 0, 0], materials.black, group);
}

function buildKeyboard(keyboard) {
  const group = componentGroup('keyboard', keyboard.name, [0, currentCase.keyboardY, currentCase.keyboardZ]);
  const [width, height, depth] = keyboard.dims;
  box('keyboard body', [width, height, Math.max(2, depth)], [0, 0, 0], materials.black, group);
  const isBlackBerry = keyboard.group === 'BlackBerry';
  if (isBlackBerry) {
    const rows = 4;
    const columns = 10;
    const keyWidth = Math.min(6.2, width / (columns + 1));
    const keyHeight = Math.min(7.2, height / (rows + 2));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (column - (columns - 1) / 2) * keyWidth * 1.02;
        const y = (row - (rows - 1) / 2) * keyHeight - 3;
        box('bb key', [keyWidth * 0.9, keyHeight * 0.82, 1.5], [x, y, depth / 2 + 0.8], materials.key, group);
      }
    }
    box('trackpad', [12, 9, 1.5], [0, height / 2 - 9, depth / 2 + 0.8], materials.screen, group);
  } else if (keyboard.id === 'cardkb' || keyboard.id === 'keebdeck') {
    const rows = keyboard.id === 'keebdeck' ? 6 : 5;
    const columns = keyboard.id === 'keebdeck' ? 12 : 10;
    const keyWidth = (width - 8) / columns;
    const keyHeight = (height - 8) / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        box('card key', [keyWidth * 0.78, keyHeight * 0.7, 1.6], [-width / 2 + 4 + keyWidth * (column + 0.5), -height / 2 + 4 + keyHeight * (row + 0.5), depth / 2 + 0.8], materials.key, group);
      }
    }
  } else {
    const rows = 5;
    const columns = 10;
    const usableWidth = width * 0.62;
    const keyWidth = usableWidth / columns;
    const keyHeight = Math.min(11, (height - 14) / rows);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        box('rii key', [keyWidth * 0.78, keyHeight * 0.7, 1.5], [-width / 2 + 8 + keyWidth * (column + 0.5), -height / 2 + 8 + keyHeight * (row + 0.5), depth / 2 + 0.8], materials.key, group);
      }
    }
    box('touchpad', [width * 0.28, height * 0.5, 1.4], [width * 0.32, 0, depth / 2 + 0.8], materials.screen, group);
  }
}

const explosionVectors = {
  shell: [0, 0, 0], keyboardPocket: [0, -0.75, -0.8], display: [0, 1, 0.8], s3: [1, 0.15, 0.55], c5: [1, -0.2, 0.35],
  w5500: [-1, 0.2, 0.2], batteryShield: [0, -0.35, -0.7], batteryA: [-0.55, -0.2, 0.55],
  batteryB: [0.55, -0.2, 0.55], usbC: [1, -0.8, 0.1], wifiAnt: [1, 0.8, 0.2],
  btAnt: [-1, 0.75, -0.1], nav: [0, 0.4, 1], microsd: [-0.2, 0.2, 0.7], keyboard: [0, -1, 0.8]
};

function updateViewControls() {
  for (const button of queryAll('.seg button')) {
    const active = button.dataset.view === state.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const button of queryAll('.compBtn')) {
    const active = button.dataset.id === state.selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  query('#explode').value = String(Math.round(state.explode * 100));
  query('#explodeValue').textContent = `${Math.round(state.explode * 100)}%`;
  const selectedLabel = state.selected ? objects.get(state.selected)?.userData.label : '';
  query('#modeChip').textContent = state.mode === 'component' ? `BAUTEIL · ${selectedLabel || 'AUSWAHL'}` : state.mode === 'exploded' ? 'EXPLODED' : 'GERÄT';
  query('#selectedChip').textContent = `AUSWAHL · ${selectedLabel?.toUpperCase() || 'KEINE'}`;
  query('#cadStatus').textContent = selectedLabel || 'kein Bauteil';
  for (const button of queryAll('[data-transform]')) {
    const active = button.dataset.transform === state.transformMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  query('#toggleSnap').setAttribute('aria-pressed', String(state.snap));
  query('#toggleSnap').classList.toggle('active', state.snap);
  query('#toggleXray').setAttribute('aria-pressed', String(state.xray));
  const selectedObject = state.selected ? objects.get(state.selected) : null;
  for (const input of queryAll('.axisGrid input')) {
    input.disabled = !selectedObject;
    input.value = selectedObject ? String(Math.round(selectedObject.userData.editOffset[input.dataset.axis] * 10) / 10) : '0';
  }
  query('#resetPart').disabled = !selectedObject;
}

function explosionOffset(id) {
  const amount = state.mode === 'exploded' ? state.explode : 0;
  const vector = explosionVectors[id] || [0, 0, 0];
  return new THREE.Vector3(...vector).multiplyScalar(amount * 75);
}

function rememberTransform(group) {
  if (!group?.userData?.id) return;
  const id = group.userData.id;
  group.userData.editOffset.copy(group.position).sub(group.userData.basePosition).sub(explosionOffset(id));
  group.userData.editRotation.copy(group.rotation);
  editTransforms.set(`${state.keyboard}:${id}`, {
    position: group.userData.editOffset.clone(),
    rotation: group.userData.editRotation.clone()
  });
  updateViewControls();
}

function syncTransformAttachment() {
  const object = state.selected ? objects.get(state.selected) : null;
  if (!object || !object.visible) {
    transformControls.detach();
    selectionBox.visible = false;
    return;
  }
  transformControls.attach(object);
  selectionBox.setFromObject(object);
  selectionBox.visible = true;
}

function setTransformMode(mode) {
  if (!['translate', 'rotate'].includes(mode)) return;
  state.transformMode = mode;
  transformControls.setMode(mode);
  updateViewControls();
  requestRender();
}

function setXray(enabled) {
  state.xray = enabled;
  const settings = [
    [materials.shell, 0.22],
    [materials.shellEdge, 0.3],
    [materials.pocket, 0.42]
  ];
  for (const [material, opacity] of settings) {
    material.transparent = enabled;
    material.opacity = enabled ? opacity : 1;
    material.depthWrite = !enabled;
    material.needsUpdate = true;
  }
  renderer.shadowMap.needsUpdate = true;
  updateViewControls();
  requestRender();
}

function resetSelectedTransform() {
  const object = state.selected ? objects.get(state.selected) : null;
  if (!object) return;
  object.userData.editOffset.set(0, 0, 0);
  object.userData.editRotation.set(0, 0, 0);
  editTransforms.delete(`${state.keyboard}:${state.selected}`);
  applyMode();
}

function applyMode() {
  for (const [id, group] of objects) {
    const base = group.userData.basePosition || new THREE.Vector3();
    group.position.copy(base).add(group.userData.editOffset).add(explosionOffset(id));
    group.rotation.copy(group.userData.editRotation);
    group.visible = state.mode !== 'component' || id === state.selected || (state.selected === 'batteryA' && id === 'batteryB');
  }
  syncTransformAttachment();
  renderer.shadowMap.needsUpdate = true;
  updateViewControls();
  requestRender();
}

function setViewMode(mode, selected = null) {
  state.mode = mode;
  if (selected) state.selected = selected;
  if (mode === 'component' && !state.selected) state.selected = 's3';
  if (mode === 'assembly') state.explode = 0;
  if (mode === 'exploded' && state.explode < 0.05) state.explode = 0.35;
  applyMode();
}

function fitCamera(targetObject = root, viewDirection = new THREE.Vector3(0.72, 0.55, 1)) {
  const bounds = new THREE.Box3().setFromObject(targetObject);
  if (bounds.isEmpty()) return;
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 8);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.1));
  const distance = Math.max(radius / Math.sin(verticalFov / 2), radius / Math.sin(horizontalFov / 2)) * 1.15;
  const direction = viewDirection.clone().normalize();
  camera.up.set(0, Math.abs(direction.y) > 0.98 ? 0 : 1, Math.abs(direction.y) > 0.98 ? -1 : 0);
  controls.target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(direction, distance);
  camera.near = Math.max(0.5, distance / 100);
  camera.far = Math.max(1200, distance * 6);
  camera.updateProjectionMatrix();
  controls.minDistance = Math.max(30, radius * 0.55);
  controls.maxDistance = Math.max(700, distance * 4);
  controls.update();
  requestRender();
}

function setStandardView(view) {
  const directions = {
    iso: new THREE.Vector3(0.72, 0.55, 1),
    front: new THREE.Vector3(0, 0, 1),
    top: new THREE.Vector3(0, 1, 0.0001),
    right: new THREE.Vector3(1, 0, 0)
  };
  const target = state.mode === 'component' && state.selected ? objects.get(state.selected) : root;
  fitCamera(target, directions[view] || directions.iso);
}

function selectComponent(id) {
  if (!objects.has(id)) return;
  state.selected = id;
  applyMode();
  canvas.focus({ preventScroll: true });
}

function buildAll() {
  clearRoot();
  const keyboard = keyboards.find(item => item.id === state.keyboard) || keyboards[0];
  buildShell(keyboard);
  buildKeyboardPocket();
  buildDisplay();
  buildS3();
  buildC5();
  buildW5500();
  buildBatteryShield();
  buildBatteries();
  buildUSB();
  buildAntennas();
  buildNavigation();
  buildMicroSD();
  buildKeyboard(keyboard);
  ground.position.y = -currentCase.h / 2 - 0.5;
  grid.position.y = ground.position.y + 0.1;
  axes.position.set(-currentCase.w / 2 - 18, ground.position.y + 0.2, currentCase.d / 2 + 8);
  applyMode();
  updateUI();
  buildComponentList();
  hasBuilt = true;
}

function basePrice() {
  return baseParts.reduce((total, part) => total + part.price * part.qty, 0);
}

function appendMeta(container, text, estimated = false) {
  const meta = document.createElement('span');
  meta.className = 'sub';
  meta.append(document.createTextNode(text));
  if (estimated) {
    const tag = document.createElement('span');
    tag.className = 'tag warning';
    tag.textContent = 'Schätzung';
    meta.append(' ', tag);
  }
  container.append(meta);
}

function priceRow(item, total, metaText) {
  const row = document.createElement('div');
  row.className = 'priceRow';
  row.setAttribute('role', 'listitem');
  const details = document.createElement('div');
  if (item.source?.startsWith('https://')) {
    const link = document.createElement('a');
    link.href = item.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.name;
    details.append(link);
  } else {
    details.append(document.createTextNode(item.name));
  }
  appendMeta(details, metaText, item.priceType === 'estimate');
  const price = document.createElement('strong');
  price.textContent = euro(total);
  row.append(details, price);
  return row;
}

function updateUI() {
  const keyboard = keyboards.find(item => item.id === state.keyboard) || keyboards[0];
  query('#kbdDims').textContent = `${keyboard.dims.join('×')} mm`;
  query('#kbdTitle').textContent = keyboard.name;
  query('#kbdMeta').replaceChildren(document.createTextNode(keyboard.interface), document.createElement('br'), document.createTextNode(keyboard.note));
  query('#kbdRecommend').textContent = keyboard.id === 'bbq20'
    ? 'Sehr starker Handheld-Kandidat: klein + Trackpad + BLE/USB.'
    : keyboard.id === 'cardkb'
      ? 'Sehr kompakt und direkt per I²C am S3 nutzbar.'
      : keyboard.id === 'keebdeck'
        ? 'Extrem kompakt; benötigt eine eigene PCB-Integration.'
        : keyboard.group === 'Rii'
          ? 'Rii vergrößert das Gerät; USB-Host beziehungsweise Bluetooth-Integration separat prüfen.'
          : 'Alternative Eingabeoption; Verfügbarkeit vor dem Kauf prüfen.';
  query('#kbdChip').textContent = keyboard.name;
  query('#dimW').textContent = formatMm(currentCase.w);
  query('#dimH').textContent = formatMm(currentCase.h);
  query('#dimD').textContent = formatMm(currentCase.d);
  const total = basePrice() + keyboard.price;
  query('#totalPrice').textContent = euro(total);
  query('#headerPrice').textContent = euro(total);
  query('#priceDate').textContent = `Stand ${PRICE_DATE}`;
  query('#keyboardPrice').replaceChildren(priceRow(keyboard, keyboard.price, `${keyboard.interface} · ${keyboard.dims.join(' × ')} mm`));
  query('#partsTable').replaceChildren(...baseParts.map(part => priceRow(part, part.price * part.qty, part.qty > 1 ? `${part.qty} × ${euro(part.price)} · ` : '')));
  updateViewControls();
}

function buildLists() {
  const select = query('#keyboardSelect');
  const groups = [...new Set(keyboards.map(keyboard => keyboard.group))];
  select.replaceChildren(...groups.map(groupName => {
    const group = document.createElement('optgroup');
    group.label = groupName;
    for (const keyboard of keyboards.filter(item => item.group === groupName)) {
      const option = document.createElement('option');
      option.value = keyboard.id;
      option.textContent = `${keyboard.name} — ${euro(keyboard.price)}`;
      group.append(option);
    }
    return group;
  }));
  select.value = state.keyboard;
}

function buildComponentList() {
  query('#componentList').replaceChildren(...[...objects].map(([id, object]) => {
    const button = document.createElement('button');
    button.className = 'compBtn';
    button.type = 'button';
    button.dataset.id = id;
    button.setAttribute('aria-pressed', 'false');
    const label = document.createElement('span');
    label.textContent = object.userData.label;
    const suffix = document.createElement('small');
    suffix.textContent = 'MOVE';
    button.append(label, suffix);
    button.addEventListener('click', () => selectComponent(id));
    return button;
  }));
  updateViewControls();
}

function rotateCamera(direction) {
  const offset = camera.position.clone().sub(controls.target);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * Math.PI / 12);
  camera.position.copy(controls.target).add(offset);
  controls.update();
  requestRender();
}

function zoomCamera(factor) {
  const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
  const distance = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.setLength(distance));
  controls.update();
  requestRender();
}

function componentFromIntersection(object) {
  let current = object;
  while (current && current.parent !== root) current = current.parent;
  return current?.parent === root && current.userData.componentId ? current : null;
}

let pointerStart = null;
let transformDragEndedAt = -Infinity;

function pickComponent(event) {
  if (!pointerStart || event.pointerId !== pointerStart.id) return;
  const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  pointerStart = null;
  if (distance > 5 || performance.now() - transformDragEndedAt < 80) return;
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...objects.values()].filter(object => object.visible), true)
    .map(intersection => componentFromIntersection(intersection.object))
    .find(Boolean);
  if (hit) selectComponent(hit.userData.id);
}

const drawerTriggers = { sidebar: query('#openParts'), inspector: query('#openInfo') };
const drawerBackdrop = query('#drawerBackdrop');
let openDrawerId = null;
let drawerReturnFocus = null;

function panelIsDrawer(id) {
  return id === 'sidebar' ? matchMedia('(max-width: 760px)').matches : matchMedia('(max-width: 1100px)').matches;
}

function setDrawer(id, open, restoreFocus = false) {
  const panel = query(`#${id}`);
  const trigger = drawerTriggers[id];
  if (!panelIsDrawer(id)) open = false;
  if (open) {
    for (const otherId of Object.keys(drawerTriggers)) {
      if (otherId !== id) setDrawer(otherId, false);
    }
    drawerReturnFocus = trigger;
    openDrawerId = id;
  } else if (openDrawerId === id) {
    openDrawerId = null;
  }
  panel.classList.toggle('open', open);
  panel.inert = panelIsDrawer(id) && !open;
  trigger.setAttribute('aria-expanded', String(open));
  drawerBackdrop.hidden = !openDrawerId;
  document.body.classList.toggle('drawerOpen', Boolean(openDrawerId));
  if (open) {
    panel.querySelector('button,select,input,a')?.focus();
  } else if (restoreFocus && drawerReturnFocus) {
    drawerReturnFocus.focus();
  }
}

function closeDrawers(restoreFocus = false) {
  if (openDrawerId) setDrawer(openDrawerId, false, restoreFocus);
}

function syncResponsivePanels() {
  for (const id of Object.keys(drawerTriggers)) {
    const panel = query(`#${id}`);
    const drawer = panelIsDrawer(id);
    if (!drawer) {
      panel.inert = false;
      panel.classList.remove('open');
      drawerTriggers[id].setAttribute('aria-expanded', 'false');
      if (openDrawerId === id) openDrawerId = null;
    } else if (openDrawerId !== id) {
      panel.inert = true;
    }
  }
  drawerBackdrop.hidden = !openDrawerId;
  document.body.classList.toggle('drawerOpen', Boolean(openDrawerId));
}

query('#keyboardSelect').addEventListener('change', event => {
  state.keyboard = event.target.value;
  setViewMode('assembly');
  buildAll();
  fitCamera(root);
});

query('#explode').addEventListener('input', event => {
  const value = Number(event.target.value) / 100;
  state.explode = value;
  state.mode = value > 0 ? 'exploded' : 'assembly';
  applyMode();
  fitCamera(root);
});

for (const button of queryAll('.seg button')) {
  button.addEventListener('click', () => {
    const mode = button.dataset.view;
    if (mode === 'component') {
      selectComponent(state.selected || 's3');
    } else {
      setViewMode(mode);
      fitCamera(root);
    }
  });
}

query('#resetCamera').addEventListener('click', () => fitCamera(state.mode === 'component' && state.selected ? objects.get(state.selected) : root));
query('#resetPart').addEventListener('click', resetSelectedTransform);
query('#toggleXray').addEventListener('click', () => setXray(!state.xray));
query('#toggleSnap').addEventListener('click', () => {
  state.snap = !state.snap;
  transformControls.setTranslationSnap(state.snap ? 1 : null);
  transformControls.setRotationSnap(state.snap ? THREE.MathUtils.degToRad(15) : null);
  updateViewControls();
});
for (const button of queryAll('[data-transform]')) {
  button.addEventListener('click', () => setTransformMode(button.dataset.transform));
}
for (const input of queryAll('.axisGrid input')) {
  input.addEventListener('input', () => {
    const object = state.selected ? objects.get(state.selected) : null;
    if (!input.value.trim()) return;
    const value = Number(input.value);
    if (!object || !Number.isFinite(value)) return;
    object.userData.editOffset[input.dataset.axis] = value;
    editTransforms.set(`${state.keyboard}:${state.selected}`, {
      position: object.userData.editOffset.clone(),
      rotation: object.userData.editRotation.clone()
    });
    applyMode();
  });
}
drawerTriggers.sidebar.addEventListener('click', () => setDrawer('sidebar', openDrawerId !== 'sidebar'));
drawerTriggers.inspector.addEventListener('click', () => setDrawer('inspector', openDrawerId !== 'inspector'));
drawerBackdrop.addEventListener('click', () => closeDrawers(true));
canvas.addEventListener('pointerdown', event => {
  closeDrawers();
  pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
canvas.addEventListener('pointerup', pickComponent);

for (const button of queryAll('[data-camera]')) {
  button.addEventListener('click', () => {
    const action = button.dataset.camera;
    if (action === 'left') rotateCamera(-1);
    if (action === 'right') rotateCamera(1);
    if (action === 'in') zoomCamera(0.82);
    if (action === 'out') zoomCamera(1.22);
  });
}

for (const button of queryAll('[data-standard-view]')) {
  button.addEventListener('click', () => setStandardView(button.dataset.standardView));
}

transformControls.addEventListener('dragging-changed', event => {
  controls.enabled = !event.value;
  if (!event.value) transformDragEndedAt = performance.now();
});
transformControls.addEventListener('objectChange', () => {
  rememberTransform(transformControls.object);
  selectionBox.setFromObject(transformControls.object);
  renderer.shadowMap.needsUpdate = true;
  requestRender();
});
transformControls.addEventListener('change', requestRender);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && openDrawerId) {
    event.preventDefault();
    closeDrawers(true);
  }
  if (event.key === 'Tab' && openDrawerId) {
    const focusable = queryAll(`#${openDrawerId} button:not([disabled]), #${openDrawerId} select:not([disabled]), #${openDrawerId} input:not([disabled]), #${openDrawerId} a[href]`).filter(element => !element.inert);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.target.matches('input, select, textarea')) {
    if (event.key.toLowerCase() === 'g') setTransformMode('translate');
    if (event.key.toLowerCase() === 'r') setTransformMode('rotate');
  }
});

window.addEventListener('resize', syncResponsivePanels);
controls.addEventListener('change', requestRender);

function resize() {
  const bounds = canvas.parentElement.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return;
  renderer.setSize(bounds.width, bounds.height, false);
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
  if (hasBuilt) fitCamera(state.mode === 'component' && state.selected ? objects.get(state.selected) : root);
  requestRender();
}

new ResizeObserver(resize).observe(canvas.parentElement);
document.addEventListener('visibilitychange', requestRender);

function renderFrame() {
  renderRequest = 0;
  if (document.hidden) return;
  const controlsChanged = controls.update();
  if (renderQueued || controlsChanged) {
    renderer.render(scene, camera);
    renderQueued = false;
  }
  if (controlsChanged) requestRender();
}

buildLists();
buildAll();
resize();
fitCamera(root);
syncResponsivePanels();
renderer.shadowMap.needsUpdate = true;
document.documentElement.dataset.hackerdeckReady = 'true';
requestRender();
