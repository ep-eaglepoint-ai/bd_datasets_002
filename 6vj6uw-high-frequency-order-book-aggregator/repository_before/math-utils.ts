// math-utils.ts
// Provides basic decimal arithmetic with precision handling (can be rewritten in a more efficient way if needed)
export class Decimal {
    private value: bigint;
    private scale: number;

    constructor(value: number | string | bigint, scale: number = 10) {
        this.scale = scale;
        if (typeof value === 'number') {
            this.value = BigInt(Math.round(value * Math.pow(10, scale)));
        } else if (typeof value === 'string') {
            const [intPart, fracPart] = value.split('.');
            const frac = fracPart ? fracPart.padEnd(scale, '0').slice(0, scale) : '0'.repeat(scale);
            this.value = BigInt(intPart + frac);
        } else {
            this.value = value;
        }
    }

    add(other: Decimal): Decimal {
        if (this.scale !== other.scale) {
            throw new Error('Scales must match');
        }
        return new Decimal(this.value + other.value, this.scale);
    }

    sub(other: Decimal): Decimal {
        if (this.scale !== other.scale) {
            throw new Error('Scales must match');
        }
        return new Decimal(this.value - other.value, this.scale);
    }

    compare(other: Decimal): number {
        if (this.scale !== other.scale) {
            throw new Error('Scales must match');
        }
        if (this.value > other.value) return 1;
        if (this.value < other.value) return -1;
        return 0;
    }

    toString(): string {
        const str = this.value.toString().padStart(this.scale + 1, '0');
        const intPart = str.slice(0, -this.scale);
        const fracPart = str.slice(-this.scale);
        return `${intPart}.${fracPart}`.replace(/\.?0+$/, '');
    }

    toNumber(): number {
        return Number(this.toString());
    }
}