/**
 * View Alignment Utility
 * Provides functions for 3D view alignment, camera positioning, and reference axis display
 */

import * as THREE from 'three'

/**
 * Calculate the best viewing angle based on reference points
 * @param {Array} referencePoints - Array of 3D coordinates [{x, y, z}, ...]
 * @param {THREE.Camera} camera - The Three.js camera
 * @param {number} distanceMultiplier - How far the camera should be from the center (default 1.5)
 * @returns {Object} Camera position and target
 */
export function calculateBestViewAngle(referencePoints, camera, distanceMultiplier = 1.5) {
    if (!referencePoints || referencePoints.length === 0) {
        return null
    }

    // Calculate the center of all reference points
    const center = new THREE.Vector3()
    referencePoints.forEach(point => {
        center.add(new THREE.Vector3(point.x, point.y, point.z))
    })
    center.divideScalar(referencePoints.length)

    // Calculate bounding box to determine optimal distance
    const boundingBox = new THREE.Box3()
    referencePoints.forEach(point => {
        boundingBox.expandByPoint(new THREE.Vector3(point.x, point.y, point.z))
    })

    const size = boundingBox.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    // Calculate camera distance based on FOV
    const fov = camera.fov * (Math.PI / 180)
    let distance = Math.abs(maxDim / 2 / Math.tan(fov / 2))
    distance *= distanceMultiplier

    // Position camera at an optimal angle (45 degrees elevation, looking at center)
    const cameraPosition = new THREE.Vector3(
        center.x + distance * 0.7,
        center.y + distance * 0.5,
        center.z + distance * 0.7
    )

    return {
        position: cameraPosition,
        target: center,
        distance
    }
}

/**
 * Create a transformation matrix from scale, rotation, and offset
 * @param {number} scale - Scale factor
 * @param {number} rotation - Rotation angle in degrees
 * @param {Object} offset - Offset {x, y, z}
 * @returns {THREE.Matrix4} Transformation matrix
 */
export function createTransformationMatrix(scale = 1, rotation = 0, offset = { x: 0, y: 0, z: 0 }) {
    const matrix = new THREE.Matrix4()

    // Create individual transformation matrices
    const scaleMatrix = new THREE.Matrix4().makeScale(scale, scale, scale)
    const rotationMatrix = new THREE.Matrix4().makeRotationY(rotation * Math.PI / 180)
    const translationMatrix = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z)

    // Combine: Translation * Rotation * Scale
    matrix.multiply(translationMatrix)
    matrix.multiply(rotationMatrix)
    matrix.multiply(scaleMatrix)

    return matrix
}

/**
 * Reset the camera view to default position
 * @param {THREE.Camera} camera - The Three.js camera
 * @param {OrbitControls} controls - The OrbitControls instance
 * @param {Object} defaultPosition - Default camera position {x, y, z}
 * @param {Object} defaultTarget - Default look-at target {x, y, z}
 * @param {boolean} animate - Whether to animate the transition
 * @param {number} duration - Animation duration in ms
 * @returns {Promise} Resolves when animation completes
 */
export function resetView(camera, controls, defaultPosition = { x: 10, y: 10, z: 10 }, defaultTarget = { x: 0, y: 0, z: 0 }, animate = true, duration = 1000) {
    return new Promise((resolve) => {
        if (!animate) {
            camera.position.set(defaultPosition.x, defaultPosition.y, defaultPosition.z)
            controls.target.set(defaultTarget.x, defaultTarget.y, defaultTarget.z)
            controls.update()
            resolve()
            return
        }

        const startPosition = camera.position.clone()
        const startTarget = controls.target.clone()
        const endPosition = new THREE.Vector3(defaultPosition.x, defaultPosition.y, defaultPosition.z)
        const endTarget = new THREE.Vector3(defaultTarget.x, defaultTarget.y, defaultTarget.z)

        const startTime = Date.now()

        const animateReset = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Ease-out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3)

            camera.position.lerpVectors(startPosition, endPosition, easeProgress)
            controls.target.lerpVectors(startTarget, endTarget, easeProgress)
            controls.update()

            if (progress < 1) {
                requestAnimationFrame(animateReset)
            } else {
                resolve()
            }
        }

        requestAnimationFrame(animateReset)
    })
}

/**
 * Draw 2D reference axis lines in 3D space
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {number} rotation - Current rotation angle in degrees
 * @param {number} size - Size of the axis lines
 * @returns {THREE.Group} The axis group (can be removed later)
 */
export function drawReferenceAxis(scene, rotation = 0, size = 10) {
    // Remove existing axis group if present
    const existingAxis = scene.getObjectByName('referenceAxisGroup')
    if (existingAxis) {
        scene.remove(existingAxis)
    }

    const axisGroup = new THREE.Group()
    axisGroup.name = 'referenceAxisGroup'

    // X axis (red)
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-size, 0, 0),
        new THREE.Vector3(size, 0, 0)
    ])
    const xAxis = new THREE.Line(xGeometry, xMaterial)
    axisGroup.add(xAxis)

    // Add X axis arrow
    const xArrow = new THREE.ConeGeometry(0.2, 0.5, 8)
    const xArrowMesh = new THREE.Mesh(xArrow, new THREE.MeshBasicMaterial({ color: 0xff0000 }))
    xArrowMesh.position.set(size, 0, 0)
    xArrowMesh.rotation.z = -Math.PI / 2
    axisGroup.add(xArrowMesh)

    // Y axis (green) - In CAD, Y is typically the second horizontal axis
    const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 })
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -size),
        new THREE.Vector3(0, 0, size)
    ])
    const yAxis = new THREE.Line(yGeometry, yMaterial)
    axisGroup.add(yAxis)

    // Add Y axis arrow
    const yArrow = new THREE.ConeGeometry(0.2, 0.5, 8)
    const yArrowMesh = new THREE.Mesh(yArrow, new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
    yArrowMesh.position.set(0, 0, size)
    yArrowMesh.rotation.x = Math.PI / 2
    axisGroup.add(yArrowMesh)

    // Z axis (blue) - vertical
    const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 })
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, size, 0)
    ])
    const zAxis = new THREE.Line(zGeometry, zMaterial)
    axisGroup.add(zAxis)

    // Add Z axis arrow
    const zArrow = new THREE.ConeGeometry(0.2, 0.5, 8)
    const zArrowMesh = new THREE.Mesh(zArrow, new THREE.MeshBasicMaterial({ color: 0x0000ff }))
    zArrowMesh.position.set(0, size, 0)
    axisGroup.add(zArrowMesh)

    // Apply rotation
    axisGroup.rotation.y = rotation * Math.PI / 180

    scene.add(axisGroup)
    return axisGroup
}

/**
 * Remove reference axis from scene
 * @param {THREE.Scene} scene - The Three.js scene
 */
export function removeReferenceAxis(scene) {
    const existingAxis = scene.getObjectByName('referenceAxisGroup')
    if (existingAxis) {
        scene.remove(existingAxis)
    }
}

/**
 * Smoothly animate camera to a new position
 * @param {THREE.Camera} camera - The Three.js camera
 * @param {OrbitControls} controls - The OrbitControls instance
 * @param {Object} targetPosition - Target camera position {x, y, z}
 * @param {Object} lookAtTarget - Look-at target {x, y, z}
 * @param {number} duration - Animation duration in ms
 * @returns {Promise} Resolves when animation completes
 */
export function animateCameraTo(camera, controls, targetPosition, lookAtTarget, duration = 1000) {
    return new Promise((resolve) => {
        const startPosition = camera.position.clone()
        const startTarget = controls.target.clone()
        const endPosition = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z)
        const endTarget = new THREE.Vector3(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z)

        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Ease-out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3)

            camera.position.lerpVectors(startPosition, endPosition, easeProgress)
            controls.target.lerpVectors(startTarget, endTarget, easeProgress)
            controls.update()

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                resolve()
            }
        }

        requestAnimationFrame(animate)
    })
}

/**
 * Calculate scale factor between 2D CAD and 3D model
 * @param {Array} points2D - Array of 2D points [{x, y}, ...]
 * @param {Array} points3D - Array of corresponding 3D points [{x, y, z}, ...]
 * @returns {number} Scale factor
 */
export function calculateScaleFactor(points2D, points3D) {
    if (points2D.length < 2 || points3D.length < 2) {
        return 1
    }

    // Calculate distances between first two points in both systems
    const dist2D = Math.sqrt(
        Math.pow(points2D[1].x - points2D[0].x, 2) +
        Math.pow(points2D[1].y - points2D[0].y, 2)
    )

    const dist3D = Math.sqrt(
        Math.pow(points3D[1].x - points3D[0].x, 2) +
        Math.pow(points3D[1].z - points3D[0].z, 2) // In 3D, we use X-Z plane for horizontal distances
    )

    if (dist2D === 0) return 1

    return dist3D / dist2D
}

/**
 * Calculate rotation angle between 2D and 3D coordinate systems
 * @param {Array} points2D - Array of 2D points [{x, y}, ...]
 * @param {Array} points3D - Array of corresponding 3D points [{x, y, z}, ...]
 * @returns {number} Rotation angle in degrees
 */
export function calculateRotationAngle(points2D, points3D) {
    if (points2D.length < 2 || points3D.length < 2) {
        return 0
    }

    // Calculate angle of line between first two points in 2D
    const angle2D = Math.atan2(
        points2D[1].y - points2D[0].y,
        points2D[1].x - points2D[0].x
    )

    // Calculate angle of line between first two points in 3D (X-Z plane)
    const angle3D = Math.atan2(
        points3D[1].z - points3D[0].z,
        points3D[1].x - points3D[0].x
    )

    // Return difference in degrees
    return (angle3D - angle2D) * 180 / Math.PI
}

/**
 * Create reference point markers in 3D scene
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Array} points - Array of 3D points [{x, y, z, label}, ...]
 * @param {Object} options - Marker options
 * @returns {THREE.Group} Group containing all markers
 */
export function createReferencePointMarkers(scene, points, options = {}) {
    const {
        color = 0xff4444,
        radius = 0.3,
        pulseAnimation = true
    } = options

    // Remove existing markers
    const existingMarkers = scene.getObjectByName('referencePointMarkers')
    if (existingMarkers) {
        scene.remove(existingMarkers)
    }

    const markersGroup = new THREE.Group()
    markersGroup.name = 'referencePointMarkers'

    points.forEach((point, index) => {
        // Create sphere
        const geometry = new THREE.SphereGeometry(radius, 16, 16)
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.5
        })
        const sphere = new THREE.Mesh(geometry, material)
        sphere.position.set(point.x, point.y, point.z)
        sphere.userData = {
            label: point.label || (index + 1),
            originalPosition: { x: point.x, y: point.y, z: point.z }
        }

        // Add label sprite
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(32, 32, 28, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ff4444'
        ctx.font = 'bold 32px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText((point.label || (index + 1)).toString(), 32, 32)

        const texture = new THREE.CanvasTexture(canvas)
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.position.set(point.x, point.y + radius * 2, point.z)
        sprite.scale.set(1, 1, 1)

        markersGroup.add(sphere)
        markersGroup.add(sprite)
    })

    scene.add(markersGroup)
    return markersGroup
}

/**
 * Remove reference point markers from scene
 * @param {THREE.Scene} scene - The Three.js scene
 */
export function removeReferencePointMarkers(scene) {
    const existingMarkers = scene.getObjectByName('referencePointMarkers')
    if (existingMarkers) {
        scene.remove(existingMarkers)
        existingMarkers.traverse((child) => {
            if (child.geometry) child.geometry.dispose()
            if (child.material) {
                if (child.material.map) child.material.map.dispose()
                child.material.dispose()
            }
        })
    }
}

export default {
    calculateBestViewAngle,
    createTransformationMatrix,
    resetView,
    drawReferenceAxis,
    removeReferenceAxis,
    animateCameraTo,
    calculateScaleFactor,
    calculateRotationAngle,
    createReferencePointMarkers,
    removeReferencePointMarkers
}
