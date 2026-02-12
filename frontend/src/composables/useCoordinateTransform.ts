/**
 * 坐标转换 Composable
 * 封装2D↔3D坐标转换、视口状态管理、对齐参数计算等逻辑
 */

import { ref, reactive, shallowRef, computed, type Ref, type ShallowRef } from 'vue'
import { CoordinateMapper, createDefaultMapper } from '../utils/coordinateMapper.js'
import api from '../api/index.js'

/**
 * 2D坐标
 */
export interface Coordinate2D {
    x: number
    y: number
}

/**
 * 3D坐标
 */
export interface Coordinate3D {
    x: number
    y: number
    z: number
}

/**
 * 楼层信息
 */
export interface Floor {
    id: string
    name: string
    level: number
    height: number
    projectId: string
}

/**
 * 参考点（2D）
 */
export interface ReferencePoint2D {
    id: string
    x: number
    y: number
    label: string
}

/**
 * 参考点（3D）
 */
export interface ReferencePoint3D {
    id: string
    x: number
    y: number
    z: number
    label: string
}

/**
 * 对齐参数
 */
export interface AlignmentParams {
    scale: number
    rotation: number  // 角度
    offsetX: number
    offsetY: number
}

/**
 * 视口状态
 */
export interface ViewportState {
    zoomFactor: number
    offsetX: number
    offsetY: number
    rotation: number
}

/**
 * 项目坐标配置
 */
export interface ProjectCoordinateConfig {
    cadConfig: {
        originX: number
        originY: number
        rotation: number
        unit: string
        yAxisUp: boolean
    }
    modelTransform: {
        offsetX: number
        offsetY: number
        offsetZ: number
        scale: number
        rotationY: number
    }
    gpsOrigin?: {
        latitude: number
        longitude: number
        altitude?: number
    }
}

/**
 * 坐标转换 Composable
 * @param floors - 楼层列表
 */
export function useCoordinateTransform(floors: Ref<Floor[]>) {
    // 坐标转换器实例
    const mapper: ShallowRef<CoordinateMapper | null> = shallowRef(null)

    // 对齐参数
    const alignmentParams = reactive<AlignmentParams>({
        scale: 1,
        rotation: 0,
        offsetX: 0,
        offsetY: 0
    })

    // 2D参考点
    const referencePoints2D = ref<ReferencePoint2D[]>([])

    // 3D参考点
    const referencePoints3D = ref<ReferencePoint3D[]>([])

    // 视口状态
    const viewportState = reactive<ViewportState>({
        zoomFactor: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0
    })

    // 是否已完成对齐
    const isAligned = computed(() => {
        return referencePoints2D.value.length >= 2 && referencePoints3D.value.length >= 2
    })

    /**
     * 初始化坐标转换器
     */
    const initMapper = () => {
        if (floors.value && floors.value.length > 0) {
            mapper.value = createDefaultMapper(floors.value)
            console.log('✅ 坐标转换器已初始化，楼层数:', floors.value.length)
        } else {
            console.warn('⚠️ 无法初始化坐标转换器：楼层数据为空')
        }
    }

    // 项目配置加载状态
    const projectConfig = ref<ProjectCoordinateConfig | null>(null)
    const configLoading = ref(false)
    const configLoaded = ref(false)

    /**
     * 从项目配置加载坐标参数
     * @param projectId - 项目ID
     */
    const loadProjectConfig = async (projectId: string): Promise<boolean> => {
        if (!projectId) {
            console.warn('⚠️ 无法加载项目配置：缺少projectId')
            return false
        }

        try {
            configLoading.value = true
            const response = await api.project.getCoordinateConfig(projectId)
            // 提取响应数据（兼容AxiosResponse和直接返回数据）
            const configData = (response as any)?.data || response
            projectConfig.value = configData as ProjectCoordinateConfig

            // 应用配置到对齐参数
            if (configData) {
                applyProjectConfig(configData as ProjectCoordinateConfig)
                configLoaded.value = true
                console.log('✅ 项目坐标配置已加载:', configData)
            }
            return true
        } catch (error) {
            console.error('加载项目坐标配置失败:', error)
            return false
        } finally {
            configLoading.value = false
        }
    }

    /**
     * 应用项目配置到坐标转换器
     */
    const applyProjectConfig = (config: ProjectCoordinateConfig) => {
        if (!config) return

        // 应用CAD配置
        if (config.cadConfig) {
            alignmentParams.offsetX = config.cadConfig.originX || 0
            alignmentParams.offsetY = config.cadConfig.originY || 0
            alignmentParams.rotation = config.cadConfig.rotation || 0
        }

        // 应用模型变换配置
        if (config.modelTransform) {
            alignmentParams.scale = config.modelTransform.scale || 1
        }

        // 更新坐标转换器
        if (mapper.value) {
            mapper.value.updateConfig({
                scale: alignmentParams.scale,
                rotation: alignmentParams.rotation,
                offsetX: alignmentParams.offsetX,
                offsetY: alignmentParams.offsetY
            })
        }

        console.log('📍 已应用项目坐标配置:', { ...alignmentParams })
    }

    /**
     * 获取单位转换比例
     */
    const getUnitScale = (): number => {
        if (!projectConfig.value?.cadConfig?.unit) return 1

        const unitMap: Record<string, number> = {
            'mm': 0.001,  // 毫米转米
            'cm': 0.01,   // 厘米转米
            'm': 1        // 米
        }
        return unitMap[projectConfig.value.cadConfig.unit] || 1
    }

    /**
     * 2D坐标转3D坐标
     * @param coord2D - 2D坐标
     * @param floorId - 楼层ID
     * @returns 3D坐标，如果转换失败返回null
     */
    const convert2DTo3D = (coord2D: Coordinate2D, floorId: string): Coordinate3D | null => {
        if (!mapper.value) {
            console.warn('⚠️ 坐标转换器未初始化')
            return null
        }

        try {
            const result = mapper.value.convert2DTo3D(coord2D, floorId)
            return result as Coordinate3D | null
        } catch (error) {
            console.error('2D→3D坐标转换失败:', error)
            return null
        }
    }

    /**
     * 3D坐标转2D坐标
     * @param coord3D - 3D坐标
     * @param floorId - 楼层ID（可选）
     * @returns 2D坐标，如果转换失败返回null
     */
    const convert3DTo2D = (coord3D: Coordinate3D, floorId?: string): Coordinate2D | null => {
        if (!mapper.value) {
            console.warn('⚠️ 坐标转换器未初始化')
            return null
        }

        try {
            const result = mapper.value.convert3DTo2D(coord3D, floorId) as any
            return result ? { x: result.x, y: result.y } : null
        } catch (error) {
            console.error('3D→2D坐标转换失败:', error)
            return null
        }
    }

    /**
     * 根据楼层ID获取楼层高度
     * @param floorId - 楼层ID
     * @returns 楼层高度（米），如果找不到返回0
     */
    const getFloorHeight = (floorId: string): number => {
        if (!floorId || !floors.value.length) return 0

        const floor = floors.value.find(f => f.id === floorId)
        if (floor) {
            // 使用楼层的高度信息
            if (floor.height) return floor.height
            // 如果没有直接的高度信息，根据楼层序号估算（每层3米）
            const floorIndex = floors.value.indexOf(floor)
            return floorIndex * 3
        }

        return 0
    }

    /**
     * 生成随机位置（当缺少坐标数据时作为降级方案）
     * @param floorId - 楼层ID
     * @returns 3D坐标
     */
    const getRandomPosition = (floorId?: string): Coordinate3D => {
        const floorHeight = floorId ? getFloorHeight(floorId) : 0

        return {
            x: (Math.random() - 0.5) * 20,  // -10 到 10 之间
            y: floorHeight + 1.5,            // 楼层高度 + 1.5米（约在楼层中间）
            z: (Math.random() - 0.5) * 20   // -10 到 10 之间
        }
    }

    /**
     * 添加2D参考点
     */
    const addReferencePoint2D = (point: ReferencePoint2D) => {
        referencePoints2D.value.push(point)
    }

    /**
     * 添加3D参考点
     */
    const addReferencePoint3D = (point: ReferencePoint3D) => {
        referencePoints3D.value.push(point)
    }

    /**
     * 移除参考点
     */
    const removeReferencePoint = (id: string) => {
        const index2D = referencePoints2D.value.findIndex(p => p.id === id)
        if (index2D > -1) {
            referencePoints2D.value.splice(index2D, 1)
        }

        const index3D = referencePoints3D.value.findIndex(p => p.id === id)
        if (index3D > -1) {
            referencePoints3D.value.splice(index3D, 1)
        }
    }

    /**
     * 清除所有参考点
     */
    const clearReferencePoints = () => {
        referencePoints2D.value = []
        referencePoints3D.value = []

        // 重置对齐参数
        alignmentParams.scale = 1
        alignmentParams.rotation = 0
        alignmentParams.offsetX = 0
        alignmentParams.offsetY = 0
    }

    /**
     * 计算两点之间的距离（2D）
     */
    const calculateDistance2D = (p1: Coordinate2D, p2: Coordinate2D): number => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    }

    /**
     * 计算两点之间的距离（3D，忽略Y轴/高度）
     */
    const calculateDistanceXZ = (p1: Coordinate3D, p2: Coordinate3D): number => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2))
    }

    /**
     * 计算缩放比例
     */
    const calculateScaleFactor = (): number => {
        if (referencePoints2D.value.length < 2 || referencePoints3D.value.length < 2) {
            return 1
        }

        const p2D_1 = referencePoints2D.value[0]
        const p2D_2 = referencePoints2D.value[1]
        const p3D_1 = referencePoints3D.value[0]
        const p3D_2 = referencePoints3D.value[1]

        const dist2D = calculateDistance2D(p2D_1, p2D_2)
        const dist3D = calculateDistanceXZ(p3D_1, p3D_2)

        if (dist2D === 0) return 1

        return dist3D / dist2D
    }

    /**
     * 计算旋转角度
     */
    const calculateRotationAngle = (): number => {
        if (referencePoints2D.value.length < 2 || referencePoints3D.value.length < 2) {
            return 0
        }

        const p2D_1 = referencePoints2D.value[0]
        const p2D_2 = referencePoints2D.value[1]
        const p3D_1 = referencePoints3D.value[0]
        const p3D_2 = referencePoints3D.value[1]

        // 计算2D向量角度
        const angle2D = Math.atan2(p2D_2.y - p2D_1.y, p2D_2.x - p2D_1.x)

        // 计算3D向量角度（XZ平面）
        const angle3D = Math.atan2(p3D_2.z - p3D_1.z, p3D_2.x - p3D_1.x)

        // 计算旋转差异（转换为度数）
        let rotation = (angle3D - angle2D) * (180 / Math.PI)

        // 规范化到 -180 到 180 度
        while (rotation > 180) rotation -= 360
        while (rotation < -180) rotation += 360

        return rotation
    }

    /**
     * 更新对齐参数
     */
    const updateAlignmentParams = () => {
        if (referencePoints2D.value.length < 2 || referencePoints3D.value.length < 2) {
            return
        }

        // 计算缩放比例
        alignmentParams.scale = calculateScaleFactor()

        // 计算旋转角度
        alignmentParams.rotation = calculateRotationAngle()

        // 计算偏移
        const p2D = referencePoints2D.value[0]
        const p3D = referencePoints3D.value[0]
        alignmentParams.offsetX = p3D.x - p2D.x * alignmentParams.scale
        alignmentParams.offsetY = p3D.z - p2D.y * alignmentParams.scale

        // 更新坐标转换器配置
        if (mapper.value) {
            mapper.value.updateConfig({
                scale: alignmentParams.scale,
                rotation: alignmentParams.rotation,
                offsetX: alignmentParams.offsetX,
                offsetY: alignmentParams.offsetY
            })
        }

        console.log('📐 对齐参数已更新:', { ...alignmentParams })
    }

    /**
     * 更新视口状态
     */
    const updateViewportState = (state: Partial<ViewportState>) => {
        if (state.zoomFactor !== undefined) viewportState.zoomFactor = state.zoomFactor
        if (state.offsetX !== undefined) viewportState.offsetX = state.offsetX
        if (state.offsetY !== undefined) viewportState.offsetY = state.offsetY
        if (state.rotation !== undefined) viewportState.rotation = state.rotation

        // 同步到坐标转换器
        if (mapper.value) {
            mapper.value.syncViewportState({
                zoom: viewportState.zoomFactor,
                offsetX: viewportState.offsetX,
                offsetY: viewportState.offsetY
            })
        }
    }

    /**
     * 屏幕坐标转世界坐标
     */
    const screenToWorld = (screenX: number, screenY: number): Coordinate2D => {
        if (mapper.value) {
            return mapper.value.screenToWorld({ x: screenX, y: screenY }) as Coordinate2D
        }

        // 简单的默认转换
        return {
            x: (screenX - viewportState.offsetX) / viewportState.zoomFactor,
            y: (screenY - viewportState.offsetY) / viewportState.zoomFactor
        }
    }

    /**
     * 世界坐标转屏幕坐标
     */
    const worldToScreen = (worldX: number, worldY: number): Coordinate2D => {
        if (mapper.value) {
            return mapper.value.worldToScreen({ x: worldX, y: worldY }) as Coordinate2D
        }

        // 简单的默认转换
        return {
            x: worldX * viewportState.zoomFactor + viewportState.offsetX,
            y: worldY * viewportState.zoomFactor + viewportState.offsetY
        }
    }

    return {
        // 核心对象
        mapper,

        // 对齐参数
        alignmentParams,

        // 参考点
        referencePoints2D,
        referencePoints3D,

        // 视口状态
        viewportState,

        // 计算属性
        isAligned,

        // 项目配置
        projectConfig,
        configLoading,
        configLoaded,

        // 初始化方法
        initMapper,
        loadProjectConfig,
        applyProjectConfig,
        getUnitScale,

        // 坐标转换
        convert2DTo3D,
        convert3DTo2D,
        getFloorHeight,
        getRandomPosition,
        screenToWorld,
        worldToScreen,

        // 参考点管理
        addReferencePoint2D,
        addReferencePoint3D,
        removeReferencePoint,
        clearReferencePoints,

        // 对齐计算
        calculateScaleFactor,
        calculateRotationAngle,
        updateAlignmentParams,

        // 视口管理
        updateViewportState
    }
}

export default useCoordinateTransform
