/**
 * Three.js 场景管理 Composable
 * 封装 Three.js 场景初始化、渲染循环、资源清理等逻辑
 */

import { ref, shallowRef, onUnmounted, watch, type Ref, type ShallowRef } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// --- 【核心修复补丁】---
// 解决 TypeError: u.addUpdateRange is not a function 报错
// 添加类型声明扩展
declare module 'three' {
    interface BufferAttribute {
        addUpdateRange(start: number, count: number): void
    }
}

const BufferAttributePrototype = THREE.BufferAttribute.prototype as THREE.BufferAttribute & {
    addUpdateRange?: (start: number, count: number) => void
}

if (!BufferAttributePrototype.addUpdateRange) {
    BufferAttributePrototype.addUpdateRange = function (this: THREE.BufferAttribute, start: number, count: number) {
        const updateRange = (this as any).updateRange
        if (updateRange.count === -1) {
            updateRange.offset = start
            updateRange.count = count
        } else {
            const oldEnd = updateRange.offset + updateRange.count
            const newEnd = start + count
            updateRange.offset = Math.min(updateRange.offset, start)
            updateRange.count = Math.max(oldEnd, newEnd) - updateRange.offset
        }
    }
    console.log('✅ 已成功注入 addUpdateRange 补丁')
}

/**
 * 场景配置选项
 */
export interface ThreeSceneOptions {
    /** 背景颜色 */
    backgroundColor?: number
    /** 是否显示网格 */
    showGrid?: boolean
    /** 网格大小 */
    gridSize?: number
    /** 网格分割数 */
    gridDivisions?: number
    /** 是否显示坐标轴 */
    showAxes?: boolean
    /** 坐标轴大小 */
    axesSize?: number
    /** 相机初始位置 */
    cameraPosition?: { x: number; y: number; z: number }
    /** 相机近裁剪面 */
    cameraNear?: number
    /** 相机远裁剪面 */
    cameraFar?: number
    /** 相机视场角 */
    cameraFov?: number
    /** 启用阻尼 */
    enableDamping?: boolean
    /** 阻尼系数 */
    dampingFactor?: number
}

const defaultOptions: ThreeSceneOptions = {
    backgroundColor: 0xf5f7fa,
    showGrid: true,
    gridSize: 100,
    gridDivisions: 100,
    showAxes: true,
    axesSize: 5,
    cameraPosition: { x: 10, y: 10, z: 10 },
    cameraNear: 0.1,
    cameraFar: 10000,
    cameraFov: 75,
    enableDamping: true,
    dampingFactor: 0.05
}

/**
 * Three.js 场景管理 Composable
 * @param containerRef - 容器元素引用
 * @param options - 场景配置选项
 */
export function useThreeScene(
    containerRef: Ref<HTMLElement | null>,
    options: ThreeSceneOptions = {}
) {
    const config = { ...defaultOptions, ...options }

    // 场景核心对象 - 使用 shallowRef 避免 Vue 响应式系统干扰 Three.js
    const scene: ShallowRef<THREE.Scene | null> = shallowRef(null)
    const camera: ShallowRef<THREE.PerspectiveCamera | null> = shallowRef(null)
    const renderer: ShallowRef<THREE.WebGLRenderer | null> = shallowRef(null)
    const controls: ShallowRef<OrbitControls | null> = shallowRef(null)

    // 辅助对象
    const gridHelper: ShallowRef<THREE.GridHelper | null> = shallowRef(null)
    const axesHelper: ShallowRef<THREE.AxesHelper | null> = shallowRef(null)

    // 状态
    const isInitialized = ref(false)
    const isAnimating = ref(false)

    // 动画帧ID
    let animationFrameId: number | null = null

    /**
     * 初始化 Three.js 场景
     */
    const init = (): boolean => {
        if (!containerRef.value) {
            console.error('❌ useThreeScene: 容器元素不存在')
            return false
        }

        const container = containerRef.value
        const width = container.clientWidth
        const height = container.clientHeight

        if (width === 0 || height === 0) {
            console.warn('⚠️ useThreeScene: 容器尺寸为0，延迟初始化')
            return false
        }

        // 创建场景
        const newScene = new THREE.Scene()
        newScene.background = new THREE.Color(config.backgroundColor!)
        scene.value = newScene

        // 创建相机
        const newCamera = new THREE.PerspectiveCamera(
            config.cameraFov!,
            width / height,
            config.cameraNear!,
            config.cameraFar!
        )
        newCamera.position.set(
            config.cameraPosition!.x,
            config.cameraPosition!.y,
            config.cameraPosition!.z
        )
        camera.value = newCamera

        // 创建渲染器
        const newRenderer = new THREE.WebGLRenderer({ antialias: true })
        newRenderer.setSize(width, height)
        newRenderer.setPixelRatio(window.devicePixelRatio)
        container.innerHTML = '' // 清空容器
        container.appendChild(newRenderer.domElement)
        renderer.value = newRenderer

        // 创建控制器
        const newControls = new OrbitControls(newCamera, newRenderer.domElement)
        newControls.enableDamping = config.enableDamping!
        newControls.dampingFactor = config.dampingFactor!
        controls.value = newControls

        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        newScene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(5, 10, 7.5)
        newScene.add(directionalLight)

        // 添加网格辅助线
        if (config.showGrid) {
            const newGridHelper = new THREE.GridHelper(config.gridSize!, config.gridDivisions!)
            newScene.add(newGridHelper)
            gridHelper.value = newGridHelper
        }

        // 添加坐标轴辅助线
        if (config.showAxes) {
            const newAxesHelper = new THREE.AxesHelper(config.axesSize!)
            newScene.add(newAxesHelper)
            axesHelper.value = newAxesHelper
        }

        isInitialized.value = true
        console.log('✅ useThreeScene: 场景初始化完成')

        return true
    }

    /**
     * 开始渲染循环
     */
    const startAnimation = () => {
        if (isAnimating.value) return
        isAnimating.value = true
        animate()
    }

    /**
     * 停止渲染循环
     */
    const stopAnimation = () => {
        isAnimating.value = false
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
        }
    }

    /**
     * 渲染循环
     */
    const animate = () => {
        if (!isAnimating.value) return

        animationFrameId = requestAnimationFrame(animate)

        try {
            if (controls.value) {
                controls.value.update()
            }

            if (renderer.value && scene.value && camera.value) {
                renderer.value.render(scene.value, camera.value)
            }
        } catch (error) {
            console.error('Three.js 渲染循环错误:', error)
            stopAnimation()
        }
    }

    /**
     * 处理窗口大小变化
     */
    const handleResize = () => {
        if (!containerRef.value || !camera.value || !renderer.value) return

        const container = containerRef.value
        const width = container.clientWidth
        const height = container.clientHeight

        camera.value.aspect = width / height
        camera.value.updateProjectionMatrix()
        renderer.value.setSize(width, height)
    }

    /**
     * 添加对象到场景
     */
    const addToScene = (object: THREE.Object3D) => {
        if (scene.value) {
            scene.value.add(object)
        }
    }

    /**
     * 从场景移除对象
     */
    const removeFromScene = (object: THREE.Object3D) => {
        if (scene.value) {
            scene.value.remove(object)
        }
    }

    /**
     * 设置网格可见性
     */
    const setGridVisible = (visible: boolean) => {
        if (gridHelper.value) {
            gridHelper.value.visible = visible
        }
    }

    /**
     * 设置坐标轴可见性
     */
    const setAxesVisible = (visible: boolean) => {
        if (axesHelper.value) {
            axesHelper.value.visible = visible
        }
    }

    /**
     * 设置相机位置
     */
    const setCameraPosition = (x: number, y: number, z: number) => {
        if (camera.value) {
            camera.value.position.set(x, y, z)
        }
    }

    /**
     * 设置控制器目标点
     */
    const setControlsTarget = (x: number, y: number, z: number) => {
        if (controls.value) {
            controls.value.target.set(x, y, z)
            controls.value.update()
        }
    }

    /**
     * 平滑移动相机到指定位置
     */
    const animateCameraTo = (
        targetPosition: { x: number; y: number; z: number },
        lookAtTarget: { x: number; y: number; z: number },
        duration: number = 1000
    ): Promise<void> => {
        return new Promise((resolve) => {
            if (!camera.value || !controls.value) {
                resolve()
                return
            }

            const startCameraPos = camera.value.position.clone()
            const startTargetPos = controls.value.target.clone()
            const startTime = Date.now()

            const animateCamera = () => {
                const elapsed = Date.now() - startTime
                const progress = Math.min(elapsed / duration, 1)

                // 使用缓动函数（ease-out）
                const easeProgress = 1 - Math.pow(1 - progress, 3)

                if (camera.value && controls.value) {
                    // 插值相机位置
                    camera.value.position.lerpVectors(
                        startCameraPos,
                        new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
                        easeProgress
                    )

                    // 插值控制器目标
                    controls.value.target.lerpVectors(
                        startTargetPos,
                        new THREE.Vector3(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z),
                        easeProgress
                    )

                    controls.value.update()
                }

                if (progress < 1) {
                    requestAnimationFrame(animateCamera)
                } else {
                    resolve()
                }
            }

            animateCamera()
        })
    }

    /**
     * 根据对象调整相机位置
     */
    const fitCameraToObject = (object: THREE.Object3D, multiplier: number = 1.5) => {
        if (!camera.value || !controls.value) return

        const box = new THREE.Box3().setFromObject(object)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = camera.value.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        cameraZ *= multiplier

        camera.value.position.set(center.x, center.y + size.y * 0.5, center.z + cameraZ)
        controls.value.target.copy(center)
        controls.value.update()
    }

    /**
     * 清理所有资源
     */
    const cleanup = () => {
        // 停止动画循环
        stopAnimation()

        // 清理渲染器
        if (renderer.value && renderer.value.domElement) {
            renderer.value.dispose()
            if (containerRef.value) {
                containerRef.value.innerHTML = ''
            }
        }

        // 清理场景中的对象
        if (scene.value) {
            scene.value.traverse((object: THREE.Object3D) => {
                if ((object as THREE.Mesh).geometry) {
                    (object as THREE.Mesh).geometry.dispose()
                }

                if ((object as THREE.Mesh).material) {
                    const material = (object as THREE.Mesh).material
                    if (Array.isArray(material)) {
                        material.forEach((mat) => mat.dispose())
                    } else {
                        material.dispose()
                    }
                }
            })
        }

        // 重置所有引用
        scene.value = null
        camera.value = null
        renderer.value = null
        controls.value = null
        gridHelper.value = null
        axesHelper.value = null
        isInitialized.value = false

        console.log('✅ useThreeScene: 资源已清理')
    }

    // 监听容器变化，自动处理窗口大小调整
    watch(containerRef, (newContainer) => {
        if (newContainer && isInitialized.value) {
            handleResize()
        }
    })

    // 组件卸载时自动清理
    onUnmounted(() => {
        cleanup()
    })

    return {
        // 核心对象
        scene,
        camera,
        renderer,
        controls,

        // 辅助对象
        gridHelper,
        axesHelper,

        // 状态
        isInitialized,
        isAnimating,

        // 方法
        init,
        startAnimation,
        stopAnimation,
        handleResize,
        addToScene,
        removeFromScene,
        setGridVisible,
        setAxesVisible,
        setCameraPosition,
        setControlsTarget,
        animateCameraTo,
        fitCameraToObject,
        cleanup
    }
}

export default useThreeScene
