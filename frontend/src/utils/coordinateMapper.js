/**
 * 坐标转换工具类
 * 用于在2D CAD坐标系和3D BIM坐标系之间进行转换
 */

export class CoordinateMapper {
    /**
     * @param {Object} projectConfig - 项目坐标系配置
     * @param {Object} projectConfig.units - 单位配置
     * @param {string} projectConfig.units.cad - CAD单位 ('mm' | 'cm' | 'm')
     * @param {string} projectConfig.units.bim - BIM单位 ('mm' | 'cm' | 'm')
     * @param {number} projectConfig.units.conversionFactor - 转换系数
     * @param {Object} projectConfig.alignment - 对齐配置
     * @param {Object} projectConfig.alignment.basePoint2D - 2D基准点 { x, y }
     * @param {Object} projectConfig.alignment.basePoint3D - 3D基准点 { x, y, z }
     * @param {number} projectConfig.alignment.rotation - 旋转角度(度)
     * @param {Array} projectConfig.floors - 楼层配置数组
     */
    constructor(projectConfig) {
        this.config = projectConfig || this.getDefaultConfig()
        this.cache = new Map() // 坐标转换缓存

        // 视口状态追踪
        this.viewportState = {
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0
        }

        // 转换矩阵 (4x4 矩阵，以数组形式存储)
        this.transformMatrix = this.createIdentityMatrix()
    }

    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            units: {
                cad: 'mm',
                bim: 'm',
                conversionFactor: 1000 // mm to m
            },
            alignment: {
                basePoint2D: { x: 0, y: 0 },
                basePoint3D: { x: 0, y: 0, z: 0 },
                rotation: 0
            },
            floors: []
        }
    }

    /**
     * 2D坐标转3D坐标
     * @param {Object} coord2D - 2D CAD坐标 { x, y }，单位为CAD单位(通常为mm)
     * @param {string} floorId - 楼层ID
     * @returns {Object|null} 3D世界坐标 { x, y, z }，单位为米，如果转换失败返回null
     */
    convert2DTo3D(coord2D, floorId) {
        if (!coord2D || typeof coord2D.x !== 'number' || typeof coord2D.y !== 'number') {
            console.warn('Invalid 2D coordinate:', coord2D)
            return null
        }

        // 检查缓存
        const cacheKey = `2d-${coord2D.x}-${coord2D.y}-${floorId}`
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
        }

        // 1. 获取楼层配置
        const floor = this.config.floors.find(f => f.id === floorId)
        if (!floor) {
            console.warn(`Floor ${floorId} not found, using default height 0`)
        }

        // 2. 单位转换 (CAD单位 -> 米)
        const factor = this.config.units.conversionFactor
        let x = coord2D.x / factor
        let z = coord2D.y / factor  // 注意: CAD的Y对应3D的Z轴

        // 3. 应用楼层偏移
        if (floor && floor.offset2D) {
            x += floor.offset2D.x / factor
            z += floor.offset2D.y / factor
        }

        // 4. 应用旋转
        const totalRotation = (floor?.rotation || 0) + this.config.alignment.rotation
        if (totalRotation !== 0) {
            const rad = totalRotation * Math.PI / 180
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            const newX = x * cos - z * sin
            const newZ = x * sin + z * cos
            x = newX
            z = newZ
        }

        // 5. 应用基准点偏移
        x += this.config.alignment.basePoint3D.x
        z += this.config.alignment.basePoint3D.z

        // 6. Y轴为楼层高度
        const y = floor?.height || 0

        const result = { x, y, z }

        // 缓存结果
        this.cache.set(cacheKey, result)

        return result
    }

    /**
     * 3D坐标转2D坐标
     * @param {Object} coord3D - 3D世界坐标 { x, y, z }，单位为米
     * @param {string} floorId - 指定楼层ID（可选，如果不指定则根据y坐标自动判断）
     * @returns {Object|null} 2D CAD坐标 { x, y, floorId }，坐标单位为CAD单位(mm)
     */
    convert3DTo2D(coord3D, floorId = null) {
        if (!coord3D || typeof coord3D.x !== 'number' || typeof coord3D.z !== 'number') {
            console.warn('Invalid 3D coordinate:', coord3D)
            return null
        }

        // 检查缓存
        const cacheKey = `3d-${coord3D.x}-${coord3D.y}-${coord3D.z}`
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
        }

        // 1. 确定楼层
        let floor = null
        if (floorId) {
            floor = this.config.floors.find(f => f.id === floorId)
        } else {
            // 根据y坐标自动判断楼层
            floor = this.findFloorByHeight(coord3D.y)
        }

        // 2. 反向应用基准点偏移
        let x = coord3D.x - this.config.alignment.basePoint3D.x
        let z = coord3D.z - this.config.alignment.basePoint3D.z

        // 3. 反向应用旋转
        const totalRotation = (floor?.rotation || 0) + this.config.alignment.rotation
        if (totalRotation !== 0) {
            const rad = -totalRotation * Math.PI / 180 // 反向旋转
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            const newX = x * cos - z * sin
            const newZ = x * sin + z * cos
            x = newX
            z = newZ
        }

        // 4. 反向应用楼层偏移
        if (floor && floor.offset2D) {
            const factor = this.config.units.conversionFactor
            x -= floor.offset2D.x / factor
            z -= floor.offset2D.y / factor
        }

        // 5. 单位转换 (米 -> CAD单位)
        const factor = this.config.units.conversionFactor
        const result = {
            x: x * factor,
            y: z * factor,  // 3D的Z对应2D的Y
            floorId: floor?.id || null
        }

        // 缓存结果
        this.cache.set(cacheKey, result)

        return result
    }

    /**
     * 根据高度查找楼层
     * @param {number} height - 高度(米)
     * @returns {Object|null} 楼层配置对象
     */
    findFloorByHeight(height) {
        if (!this.config.floors || this.config.floors.length === 0) {
            return null
        }

        // 找到最接近的楼层
        let closestFloor = this.config.floors[0]
        let minDiff = Math.abs(height - closestFloor.height)

        for (const floor of this.config.floors) {
            const diff = Math.abs(height - floor.height)
            if (diff < minDiff) {
                minDiff = diff
                closestFloor = floor
            }
        }

        return closestFloor
    }

    /**
     * 批量转换2D坐标到3D坐标
     * @param {Array} embeddedParts - 预埋件数组
     * @returns {Array} 包含3D坐标的预埋件数组
     */
    batchConvert2DTo3D(embeddedParts) {
        return embeddedParts.map(ep => {
            if (!ep.coordinates2D) return ep

            const coord3D = this.convert2DTo3D(ep.coordinates2D, ep.floorId)
            return {
                ...ep,
                coordinates3D: coord3D
            }
        })
    }

    /**
     * 批量转换3D坐标到2D坐标
     * @param {Array} embeddedParts - 预埋件数组
     * @returns {Array} 包含2D坐标的预埋件数组
     */
    batchConvert3DTo2D(embeddedParts) {
        return embeddedParts.map(ep => {
            if (!ep.coordinates3D) return ep

            const coord2D = this.convert3DTo2D(ep.coordinates3D, ep.floorId)
            if (coord2D) {
                return {
                    ...ep,
                    coordinates2D: {
                        x: coord2D.x,
                        y: coord2D.y
                    }
                }
            }
            return ep
        })
    }

    /**
     * 更新项目配置
     * @param {Object} newConfig - 新的配置对象
     */
    updateConfig(newConfig) {
        // 检查是否是双视图对齐传入的参数（含 scale/offsetX/offsetY）
        if (newConfig.scale !== undefined || newConfig.offsetX !== undefined) {
            // 将对齐参数正确映射到 alignment 结构
            if (newConfig.rotation !== undefined) {
                this.config.alignment.rotation = newConfig.rotation
            }
            this.config.alignment.basePoint3D = {
                x: newConfig.offsetX ?? this.config.alignment.basePoint3D.x,
                y: this.config.alignment.basePoint3D.y,
                z: newConfig.offsetY ?? this.config.alignment.basePoint3D.z
            }
            if (newConfig.scale !== undefined) {
                // 对齐计算出的 scale = 3D距离/2D距离，已包含单位转换
                // conversionFactor 的含义是 "1个CAD单位 = 1/conversionFactor 个3D单位"
                // 所以 conversionFactor = 1 / scale
                this.config.units.conversionFactor = 1 / newConfig.scale
            }
        } else {
            // 普通配置更新（楼层等）
            this.config = {
                ...this.config,
                ...newConfig
            }
        }
        // 清空缓存，因为配置已改变
        this.clearCache()
    }

    /**
     * 清空坐标转换缓存
     */
    clearCache() {
        this.cache.clear()
    }

    /**
     * 验证坐标有效性
     * @param {Object} coord - 坐标对象
     * @param {string} type - 坐标类型 '2d' 或 '3d'
     * @returns {boolean} 是否有效
     */
    validateCoordinate(coord, type) {
        if (!coord || typeof coord !== 'object') {
            return false
        }

        if (type === '2d') {
            return typeof coord.x === 'number' &&
                typeof coord.y === 'number' &&
                !isNaN(coord.x) &&
                !isNaN(coord.y)
        } else if (type === '3d') {
            return typeof coord.x === 'number' &&
                typeof coord.y === 'number' &&
                typeof coord.z === 'number' &&
                !isNaN(coord.x) &&
                !isNaN(coord.y) &&
                !isNaN(coord.z)
        }

        return false
    }

    /**
     * 计算两个坐标之间的距离
     * @param {Object} coord1 - 第一个坐标
     * @param {Object} coord2 - 第二个坐标
     * @param {string} type - 坐标类型 '2d' 或 '3d'
     * @returns {number} 距离
     */
    calculateDistance(coord1, coord2, type = '2d') {
        if (type === '2d') {
            const dx = coord2.x - coord1.x
            const dy = coord2.y - coord1.y
            return Math.sqrt(dx * dx + dy * dy)
        } else {
            const dx = coord2.x - coord1.x
            const dy = coord2.y - coord1.y
            const dz = coord2.z - coord1.z
            return Math.sqrt(dx * dx + dy * dy + dz * dz)
        }
    }

    /**
     * 创建单位矩阵 (4x4)
     * @returns {Array} 4x4 单位矩阵
     */
    createIdentityMatrix() {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]
    }

    /**
     * 设置当前缩放因子
     * @param {number} factor - 缩放因子
     */
    setZoomFactor(factor) {
        this.viewportState.zoom = factor
        this.updateTransformMatrix()
        this.clearCache()
    }

    /**
     * 获取当前缩放因子
     * @returns {number} 缩放因子
     */
    getZoomFactor() {
        return this.viewportState.zoom
    }

    /**
     * 设置视口偏移
     * @param {number} offsetX - X轴偏移
     * @param {number} offsetY - Y轴偏移
     */
    setViewOffset(offsetX, offsetY) {
        this.viewportState.offsetX = offsetX
        this.viewportState.offsetY = offsetY
        this.updateTransformMatrix()
    }

    /**
     * 设置旋转角度
     * @param {number} rotation - 旋转角度（度）
     */
    setRotation(rotation) {
        this.viewportState.rotation = rotation
        this.updateTransformMatrix()
        this.clearCache()
    }

    /**
     * 获取当前转换矩阵
     * @returns {Array} 4x4 转换矩阵
     */
    getTransformMatrix() {
        return [...this.transformMatrix]
    }

    /**
     * 更新转换矩阵
     */
    updateTransformMatrix() {
        const { zoom, offsetX, offsetY, rotation } = this.viewportState
        const rad = rotation * Math.PI / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)

        // 构建变换矩阵: Translation * Rotation * Scale
        this.transformMatrix = [
            zoom * cos, -zoom * sin, 0, offsetX,
            zoom * sin, zoom * cos, 0, offsetY,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]
    }

    /**
     * 同步视口状态
     * @param {Object} viewport2D - 2D视口状态
     * @param {Object} viewport3D - 3D视口状态 (可选)
     */
    syncViewportState(viewport2D, viewport3D = null) {
        if (viewport2D) {
            this.viewportState.zoom = viewport2D.zoom || 1
            this.viewportState.offsetX = viewport2D.offsetX || 0
            this.viewportState.offsetY = viewport2D.offsetY || 0
            this.viewportState.rotation = viewport2D.rotation || 0
            this.updateTransformMatrix()
        }

        return {
            viewport2D: { ...this.viewportState },
            transformMatrix: this.getTransformMatrix()
        }
    }

    /**
     * 应用视口变换到坐标
     * @param {Object} screenCoord - 屏幕坐标 { x, y }
     * @returns {Object} 世界坐标 { x, y }
     */
    screenToWorld(screenCoord) {
        const { zoom, offsetX, offsetY, rotation } = this.viewportState

        // 反向应用变换
        let x = (screenCoord.x - offsetX) / zoom
        let y = (screenCoord.y - offsetY) / zoom

        // 反向旋转
        if (rotation !== 0) {
            const rad = -rotation * Math.PI / 180
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            const newX = x * cos - y * sin
            const newY = x * sin + y * cos
            x = newX
            y = newY
        }

        return { x, y }
    }

    /**
     * 将世界坐标转换为屏幕坐标
     * @param {Object} worldCoord - 世界坐标 { x, y }
     * @returns {Object} 屏幕坐标 { x, y }
     */
    worldToScreen(worldCoord) {
        const { zoom, offsetX, offsetY, rotation } = this.viewportState

        let x = worldCoord.x
        let y = worldCoord.y

        // 应用旋转
        if (rotation !== 0) {
            const rad = rotation * Math.PI / 180
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            const newX = x * cos - y * sin
            const newY = x * sin + y * cos
            x = newX
            y = newY
        }

        // 应用缩放和偏移
        x = x * zoom + offsetX
        y = y * zoom + offsetY

        return { x, y }
    }

    /**
     * 获取完整的视口状态
     * @returns {Object} 视口状态
     */
    getViewportState() {
        return { ...this.viewportState }
    }

    /**
     * 计算两个坐标集之间的缩放比例
     * @param {Array} points2D - 2D点数组
     * @param {Array} points3D - 3D点数组  
     * @returns {number} 缩放比例
     */
    calculateScaleFromPoints(points2D, points3D) {
        if (points2D.length < 2 || points3D.length < 2) {
            return 1
        }

        const dist2D = this.calculateDistance(points2D[0], points2D[1], '2d')
        const dist3D = Math.sqrt(
            Math.pow(points3D[1].x - points3D[0].x, 2) +
            Math.pow(points3D[1].z - points3D[0].z, 2)
        )

        if (dist2D === 0) return 1
        return dist3D / dist2D
    }
}

/**
 * 创建默认的坐标映射器实例
 * @param {Array} floors - 楼层数组
 * @returns {CoordinateMapper} 坐标映射器实例
 */
export function createDefaultMapper(floors = []) {
    const config = {
        units: {
            cad: 'mm',
            bim: 'm',
            conversionFactor: 1000
        },
        alignment: {
            basePoint2D: { x: 0, y: 0 },
            basePoint3D: { x: 0, y: 0, z: 0 },
            rotation: 0
        },
        floors: floors.map((floor, index) => ({
            id: floor.id,
            name: floor.name,
            height: index * 3.6, // 默认层高3.6米
            offset2D: { x: 0, y: 0 },
            rotation: 0
        }))
    }

    return new CoordinateMapper(config)
}

export default CoordinateMapper
