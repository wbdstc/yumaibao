/**
 * BIM可视化系统 - 统一坐标类型定义
 * 
 * 解决问题：
 * - coordinates 和 coordinates2D 字段类型为 any
 * - 缺少物理位置（GPS）坐标支持
 * - 坐标单位和参考系不明确
 */

/**
 * 坐标单位
 */
export type CoordinateUnit = 'mm' | 'cm' | 'm'

/**
 * 坐标参考系统
 */
export type ReferenceSystem =
    | 'cad'      // CAD图纸坐标系（相对于图纸原点）
    | 'site'     // 现场坐标系（相对于项目基准点）
    | 'model'    // 3D模型坐标系（Three.js世界坐标）
    | 'wgs84'    // GPS坐标系（WGS84大地坐标）

/**
 * 2D坐标
 */
export interface Coordinate2D {
    /** X坐标值 */
    x: number
    /** Y坐标值 */
    y: number
    /** 坐标单位，默认为 mm */
    unit?: CoordinateUnit
    /** 参考坐标系 */
    referenceSystem?: ReferenceSystem
}

/**
 * 3D坐标
 */
export interface Coordinate3D extends Coordinate2D {
    /** Z坐标值（高度） */
    z: number
}

/**
 * GPS坐标
 */
export interface GPSCoordinate {
    /** 纬度 */
    latitude: number
    /** 经度 */
    longitude: number
    /** 海拔高度（米），可选 */
    altitude?: number
    /** 定位精度（米），可选 */
    accuracy?: number
    /** 时间戳 */
    timestamp?: number
}

/**
 * 完整坐标信息（包含多种坐标系）
 */
export interface FullCoordinate {
    /** CAD图纸坐标（2D） */
    cad2D?: Coordinate2D
    /** 3D模型坐标 */
    model3D?: Coordinate3D
    /** GPS位置 */
    gps?: GPSCoordinate
    /** 相对于轴线的位置描述 */
    gridReference?: GridReference
}

/**
 * 轴线参考位置
 * 例如：A轴+2000mm, 1轴+1500mm
 */
export interface GridReference {
    /** 横向轴线名称（如 A, B, C） */
    horizontalAxis: string
    /** 距离横向轴线的偏移量（mm） */
    horizontalOffset: number
    /** 纵向轴线名称（如 1, 2, 3） */
    verticalAxis: string
    /** 距离纵向轴线的偏移量（mm） */
    verticalOffset: number
    /** 楼层标识 */
    floor?: string
    /** 距离楼层地面的高度（mm） */
    heightFromFloor?: number
}

/**
 * 坐标验证状态
 */
export interface CoordinateValidation {
    /** 是否有效 */
    isValid: boolean
    /** 坐标来源 */
    source: 'manual' | 'import' | 'calculated' | 'unknown'
    /** 最后验证时间 */
    lastValidated?: string
    /** 验证人 */
    validatedBy?: string
    /** 验证备注 */
    notes?: string
}

/**
 * 预埋件坐标数据（完整版）
 */
export interface EmbeddedPartCoordinates {
    /** 2D图纸坐标 */
    coordinates2D?: Coordinate2D
    /** 3D模型坐标 */
    coordinates3D?: Coordinate3D
    /** 轴线参考 */
    gridReference?: GridReference
    /** GPS坐标 */
    gpsCoordinate?: GPSCoordinate
    /** 坐标验证状态 */
    validation?: CoordinateValidation
}

/**
 * 坐标转换参数
 */
export interface CoordinateTransformParams {
    /** 缩放比例 */
    scale: number
    /** 旋转角度（度） */
    rotation: number
    /** X轴偏移 */
    offsetX: number
    /** Y轴偏移 */
    offsetY: number
    /** Z轴偏移（用于3D） */
    offsetZ?: number
    /** 单位转换系数 */
    unitScale: number
}

/**
 * 项目坐标系统配置
 */
export interface ProjectCoordinateConfig {
    /** 项目ID */
    projectId: string

    /** GPS基准点（项目原点的GPS位置） */
    gpsOrigin?: GPSCoordinate

    /** CAD坐标系配置 */
    cadConfig: {
        /** CAD原点X */
        originX: number
        /** CAD原点Y */
        originY: number
        /** 与真北的夹角（度） */
        rotation: number
        /** 坐标单位 */
        unit: CoordinateUnit
        /** 单位到米的转换比例 */
        unitToMeter: number
    }

    /** 3D模型配置 */
    modelConfig: {
        /** 原点偏移 */
        originOffset: Coordinate3D
        /** 缩放比例 */
        scale: number
        /** 旋转（欧拉角，度） */
        rotation: Coordinate3D
    }

    /** 配置状态 */
    isConfigured: boolean
    /** 最后更新时间 */
    lastUpdated?: string
}

// ==================== 工具函数 ====================

/**
 * 创建默认的2D坐标
 */
export function createCoordinate2D(x: number, y: number, unit: CoordinateUnit = 'mm'): Coordinate2D {
    return { x, y, unit, referenceSystem: 'cad' }
}

/**
 * 创建默认的3D坐标
 */
export function createCoordinate3D(x: number, y: number, z: number, unit: CoordinateUnit = 'm'): Coordinate3D {
    return { x, y, z, unit, referenceSystem: 'model' }
}

/**
 * 验证坐标有效性
 */
export function isValidCoordinate2D(coord: unknown): coord is Coordinate2D {
    if (!coord || typeof coord !== 'object') return false
    const c = coord as Record<string, unknown>
    return typeof c.x === 'number' && typeof c.y === 'number' &&
        !isNaN(c.x as number) && !isNaN(c.y as number)
}

/**
 * 验证3D坐标有效性
 */
export function isValidCoordinate3D(coord: unknown): coord is Coordinate3D {
    if (!isValidCoordinate2D(coord)) return false
    const c = coord as unknown as Record<string, unknown>
    return typeof c.z === 'number' && !isNaN(c.z as number)
}

/**
 * 坐标单位转换
 */
export function convertUnit(value: number, from: CoordinateUnit, to: CoordinateUnit): number {
    const toMeter: Record<CoordinateUnit, number> = {
        'mm': 0.001,
        'cm': 0.01,
        'm': 1
    }

    const valueInMeters = value * toMeter[from]
    return valueInMeters / toMeter[to]
}

/**
 * 格式化坐标显示
 */
export function formatCoordinate2D(coord: Coordinate2D, precision: number = 2): string {
    const unit = coord.unit || 'mm'
    return `(${coord.x.toFixed(precision)}, ${coord.y.toFixed(precision)}) ${unit}`
}

/**
 * 格式化3D坐标显示
 */
export function formatCoordinate3D(coord: Coordinate3D, precision: number = 2): string {
    const unit = coord.unit || 'm'
    return `(${coord.x.toFixed(precision)}, ${coord.y.toFixed(precision)}, ${coord.z.toFixed(precision)}) ${unit}`
}

/**
 * 格式化轴线参考
 */
export function formatGridReference(ref: GridReference): string {
    const hOffset = ref.horizontalOffset >= 0 ? `+${ref.horizontalOffset}` : `${ref.horizontalOffset}`
    const vOffset = ref.verticalOffset >= 0 ? `+${ref.verticalOffset}` : `${ref.verticalOffset}`
    return `${ref.horizontalAxis}${hOffset}, ${ref.verticalAxis}${vOffset}`
}

/**
 * 计算两点之间的距离
 */
export function distance2D(a: Coordinate2D, b: Coordinate2D): number {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))
}

/**
 * 计算两点之间的3D距离
 */
export function distance3D(a: Coordinate3D, b: Coordinate3D): number {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2) + Math.pow(b.z - a.z, 2))
}
