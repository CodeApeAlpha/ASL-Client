import * as THREE from "three";
import { MeshLine, MeshLineMaterial } from "three.meshline";

const SCALE = 0.015;

const SKIN = 0xd4a574;
const SKIN_LIGHT = 0xe8c4a0;
const BODY_FILL = 0x3a5a8c;
const HEAD_FILL = 0xd4a574;
const JOINT_COLOR = 0xc4956a;
const LEFT_HAND = 0xd4a574;
const RIGHT_HAND = 0xd4a574;
const LIMB_COLOR = 0xc49a6c;

function drawPoint(x: number, y: number, z: number) {
  const geometry = new THREE.SphereGeometry(0.1, 32, 16);
  const material = new THREE.MeshBasicMaterial({ color: SKIN });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(x * SCALE, -y * SCALE, z * SCALE);
}

function drawJoint(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  radius: number,
  color?: number
) {
  const geometry = new THREE.CircleGeometry(radius, 16);
  const material = new THREE.MeshBasicMaterial({
    color: color || JOINT_COLOR,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z + 0.01);
  scene.add(mesh);
}

function drawLine(
  scene: THREE.Scene,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  color: number,
  opacity?: number,
  width?: number
) {
  const p = [];
  p.push(new THREE.Vector3(x1, -y1, z1));
  p.push(new THREE.Vector3(x2, -y2, z2));
  const geometry = new THREE.BufferGeometry().setFromPoints(p);
  const material = new MeshLineMaterial({
    color: color,
    opacity: opacity || 1,
    lineWidth: width || 0.08,
    transparent: true,
    depthTest: false,
  });
  const line = new MeshLine();
  line.setGeometry(geometry);

  const mesh = new THREE.Mesh(line, material);
  scene.add(mesh);
}

function drawLimb(
  scene: THREE.Scene,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  width: number,
  color: number
) {
  drawLine(scene, x1, y1, z1, x2, y2, z2, color, 1, width);
  drawJoint(scene, x1, -y1, z1, width * 0.6, color);
  drawJoint(scene, x2, -y2, z2, width * 0.6, color);
}

function drawBody(
  scene: THREE.Scene,
  top_left: number[],
  top_right: number[],
  bottom_right: number[],
  bottom_left: number[]
) {
  const cx = ((top_left[1] + top_right[1]) / 2) * SCALE;
  const cy = (-(top_left[2] + bottom_left[2]) / 2) * SCALE;
  const hw = Math.abs(top_right[1] - top_left[1]) * SCALE * 0.55;
  const hh = Math.abs(bottom_left[2] - top_left[2]) * SCALE * 0.55;

  const shape = new THREE.Shape();
  shape.moveTo(cx - hw, cy + hh * 0.8);
  shape.quadraticCurveTo(cx - hw * 1.1, cy, cx - hw * 0.9, cy - hh);
  shape.quadraticCurveTo(cx, cy - hh * 1.15, cx + hw * 0.9, cy - hh);
  shape.quadraticCurveTo(cx + hw * 1.1, cy, cx + hw, cy + hh * 0.8);
  shape.quadraticCurveTo(cx, cy + hh * 1.05, cx - hw, cy + hh * 0.8);

  const geometry = new THREE.ShapeGeometry(shape, 12);
  const material = new THREE.MeshBasicMaterial({
    color: BODY_FILL,
    opacity: 0.35,
    transparent: true,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const outlinePoints = [];
  const divisions = 32;
  for (let i = 0; i <= divisions; i++) {
    const point = shape.getPoint(i / divisions);
    outlinePoints.push(new THREE.Vector3(point.x, point.y, 0));
  }
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outlineMat = new MeshLineMaterial({
    color: BODY_FILL,
    lineWidth: 0.04,
    opacity: 0.5,
    transparent: true,
    depthTest: false,
  });
  const outlineLine = new MeshLine();
  outlineLine.setGeometry(outlineGeo);
  scene.add(new THREE.Mesh(outlineLine, outlineMat));
}

function drawHead(scene: THREE.Scene, left: number[], right: number[]) {
  const p1 = new THREE.Vector3(
    left[1] * SCALE,
    -left[2] * SCALE,
    left[3] * SCALE
  );
  const p2 = new THREE.Vector3(
    right[1] * SCALE,
    -right[2] * SCALE,
    right[3] * SCALE
  );

  const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const distance = p1.distanceTo(p2);
  const majorRadius = distance / 2;
  const minorRadius = majorRadius * 1.3;

  const headShape = new THREE.Shape();
  headShape.absellipse(
    midPoint.x,
    midPoint.y,
    majorRadius,
    minorRadius,
    0,
    Math.PI * 2,
    false,
    0
  );
  const geometry = new THREE.ShapeGeometry(headShape, 24);
  const material = new THREE.MeshBasicMaterial({
    color: HEAD_FILL,
    opacity: 0.4,
    transparent: true,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const ellipse = new THREE.Mesh(geometry, material);
  ellipse.position.set(0, -0.8, 0);
  scene.add(ellipse);

  const outlinePoints: THREE.Vector3[] = [];
  const divisions = 32;
  for (let i = 0; i <= divisions; i++) {
    const t = (i / divisions) * Math.PI * 2;
    outlinePoints.push(
      new THREE.Vector3(
        midPoint.x + Math.cos(t) * majorRadius,
        midPoint.y + Math.sin(t) * minorRadius - 0.8,
        0.01
      )
    );
  }
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outlineMat = new MeshLineMaterial({
    color: SKIN_LIGHT,
    lineWidth: 0.035,
    opacity: 0.6,
    transparent: true,
    depthTest: false,
  });
  const outlineLine = new MeshLine();
  outlineLine.setGeometry(outlineGeo);
  scene.add(new THREE.Mesh(outlineLine, outlineMat));

  const eyeSize = majorRadius * 0.08;
  const eyeY = midPoint.y - 0.8 + minorRadius * 0.15;
  const eyeSpacing = majorRadius * 0.35;
  const eyeGeo = new THREE.CircleGeometry(eyeSize, 12);
  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0x2c2c2c,
    opacity: 0.5,
    transparent: true,
    depthTest: false,
  });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(midPoint.x - eyeSpacing, eyeY, 0.02);
  scene.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone());
  rightEye.position.set(midPoint.x + eyeSpacing, eyeY, 0.02);
  scene.add(rightEye);
}

function drawPalm(
  scene: THREE.Scene,
  wrist: number[],
  thumb: number[],
  index: number[],
  middle: number[],
  ring: number[],
  pinky: number[],
  color?: number
) {
  const pts = [wrist, thumb, index, middle, ring, pinky];
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][1] * SCALE, -pts[0][2] * SCALE);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][1] * SCALE, -pts[i][2] * SCALE);
  }
  shape.lineTo(pts[0][1] * SCALE, -pts[0][2] * SCALE);

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: color || SKIN,
    opacity: 0.2,
    transparent: true,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}

function drawFingerTip(
  scene: THREE.Scene,
  point: number[],
  color: number
) {
  const geo = new THREE.CircleGeometry(0.025, 10);
  const mat = new THREE.MeshBasicMaterial({
    color,
    opacity: 0.9,
    transparent: true,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(point[1] * SCALE, -point[2] * SCALE, (point[3] * SCALE) + 0.01);
  scene.add(mesh);
}

function connectPose(index: number, animation: any, scene: THREE.Scene) {
  const edges = [
    [12, 14],
    [14, 16],
    [11, 13],
    [13, 15],
  ];

  const pose = animation[index][1];

  edges.map((edge) => {
    const u = edge[0];
    const v = edge[1];
    if (pose[u] && pose[v]) {
      const p1 = pose[u];
      const p2 = pose[v];
      drawLimb(
        scene,
        p1[1] * SCALE,
        p1[2] * SCALE,
        p1[3] * SCALE,
        p2[1] * SCALE,
        p2[2] * SCALE,
        p2[3] * SCALE,
        0.22,
        LIMB_COLOR
      );
    }
  });

  if (pose[11] && pose[12]) {
    drawLimb(
      scene,
      pose[11][1] * SCALE,
      pose[11][2] * SCALE,
      pose[11][3] * SCALE,
      pose[12][1] * SCALE,
      pose[12][2] * SCALE,
      pose[12][3] * SCALE,
      0.18,
      LIMB_COLOR
    );
  }

  if (pose[7] && pose[8]) {
    drawHead(scene, pose[7], pose[8]);
  }

  if (pose[11] && pose[12] && pose[23] && pose[24]) {
    drawBody(scene, pose[12], pose[11], pose[23], pose[24]);
  }
}

function connectHands(index: number, animation: any, scene: THREE.Scene) {
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17],
  ];

  const tipIndices = [4, 8, 12, 16, 20];
  const left = animation[index][2][0];
  const right = animation[index][2][1];

  edges.map((edge) => {
    const u = edge[0];
    const v = edge[1];
    if (left[u] && left[v]) {
      const l1 = left[u];
      const l2 = left[v];
      drawLine(
        scene,
        l1[1] * SCALE, l1[2] * SCALE, l1[3] * SCALE,
        l2[1] * SCALE, l2[2] * SCALE, l2[3] * SCALE,
        LEFT_HAND, 0.9, 0.06
      );
    }

    if (right[u] && right[v]) {
      const r1 = right[u];
      const r2 = right[v];
      drawLine(
        scene,
        r1[1] * SCALE, r1[2] * SCALE, r1[3] * SCALE,
        r2[1] * SCALE, r2[2] * SCALE, r2[3] * SCALE,
        RIGHT_HAND, 0.9, 0.06
      );
    }
  });

  tipIndices.forEach((ti) => {
    if (left[ti]) drawFingerTip(scene, left[ti], LEFT_HAND);
    if (right[ti]) drawFingerTip(scene, right[ti], RIGHT_HAND);
  });

  if (left[0]) drawJoint(scene, left[0][1] * SCALE, -left[0][2] * SCALE, left[0][3] * SCALE + 0.01, 0.04, LEFT_HAND);
  if (right[0]) drawJoint(scene, right[0][1] * SCALE, -right[0][2] * SCALE, right[0][3] * SCALE + 0.01, 0.04, RIGHT_HAND);

  if (left[0] && left[5] && left[9] && left[13] && left[17]) {
    drawPalm(scene, left[0], left[5], left[9], left[13], left[17], left[0], LEFT_HAND);
  }

  if (right[0] && right[5] && right[9] && right[13] && right[17]) {
    drawPalm(scene, right[0], right[5], right[9], right[13], right[17], right[0], RIGHT_HAND);
  }
}

export { drawPoint, drawLine, connectPose, connectHands };
