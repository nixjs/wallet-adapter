export class Validation {
    static isObject(value: any): boolean {
        return !!value && value.constructor === Object
    }

    static isFunction(value: any): boolean {
        return typeof value === 'function'
    }

    static isHex(value: any): boolean {
        return typeof value === 'string' && !Number.isNaN(parseInt(value, 16)) && /^(0x|)[a-fA-F0-9]+$/.test(value)
    }

    static isInteger(value: any): boolean {
        if (!value) return false
        return typeof value === 'number' && Number.isInteger(Number(value))
    }

    static isString(value: any): boolean {
        if (!value) return false
        return typeof value === 'string' || (typeof value === 'object' && value.constructor === String)
    }

    static isArray(value: any): boolean {
        return Array.isArray(value)
    }

    static isJson(value: any): boolean {
        if (!(value && typeof value === 'string')) {
            return false
        }
        try {
            JSON.parse(value)
            return true
        } catch (error) {
            return false
        }
    }

    static isBoolean(value: any): boolean {
        return typeof value === 'boolean'
    }

    static isNotNullOrUndefined(value: any): boolean {
        return value !== null && typeof value !== 'undefined'
    }

    static hasProperty(obj: object, property: string): boolean {
        return obj && Object.prototype.hasOwnProperty.call(obj, property)
    }

    static hasProperties(obj: object, properties: string[]): boolean {
        return !!(properties.length && !properties.map((property: string): boolean => this.hasProperty(obj, property)).includes(false))
    }

    static isInputNumberWithDecimals(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): boolean {
        if (
            ['ArrowRight', 'ArrowLeft', 'Backspace', 'Delete', 'Clear', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(
                e.key
            ) ||
            (e.metaKey && ['a', 'c', 'v', 'x'].includes(e.key))
        ) {
            return true
        }
        return false
    }
}
